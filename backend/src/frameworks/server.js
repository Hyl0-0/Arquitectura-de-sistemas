import http from 'http';
import { User } from '../domain/entities/User.js';

import { DynamoDbClientWrapper } from '../adapters/DynamoDbAdapter.js';
import {
  DynamoDbTenantRepository,
  DynamoDbCourseRepository,
  DynamoDbUserRepository,
  DynamoDbAttemptRepository,
  DynamoDbCertificateRepository,
  DynamoDbCircuitBreakerRepository
} from '../adapters/DynamoDbRepositories.js';

import {
  BulkheadQueue,
  SesNotificationService,
  ClaudeAiService,
  CanaryConfigRepository
} from '../adapters/ServicesAndCanary.js';

import { SubmitEvaluationUseCase } from '../usecases/SubmitEvaluationUseCase.js';
import { GenerateCourseFromPdfUseCase, ReviewDraftCourseUseCase } from '../usecases/AiAndCourseWorkflows.js';
import { TenantThemingUseCase, CanaryRoutingUseCase } from '../usecases/TenantAndCanaryUseCases.js';
import { populateInitialData } from './seedData.js';

// 1. Instanciación de Adaptadores e Infraestructura (Clean Architecture)
const dbClient = new DynamoDbClientWrapper();
const tenantRepo = new DynamoDbTenantRepository(dbClient);
const courseRepo = new DynamoDbCourseRepository(dbClient);
const userRepo = new DynamoDbUserRepository(dbClient);
const attemptRepo = new DynamoDbAttemptRepository(dbClient);
const certRepo = new DynamoDbCertificateRepository(dbClient);
const cbRepo = new DynamoDbCircuitBreakerRepository(dbClient);

const bulkheadQueue = new BulkheadQueue(2); // Máximo 2 ejecuciones concurrentes de IA
const sesNotification = new SesNotificationService({ maxRetries: 3, baseDelayMs: 150 });
const claudeAi = new ClaudeAiService();
const canaryRepo = new CanaryConfigRepository(dbClient);

// 2. Instanciación de Casos de Uso
const submitEvaluationUseCase = new SubmitEvaluationUseCase({
  attemptRepository: attemptRepo,
  courseRepository: courseRepo,
  certificateRepository: certRepo,
  notificationService: sesNotification,
  userRepository: userRepo
});

const generateCourseUseCase = new GenerateCourseFromPdfUseCase({
  courseRepository: courseRepo,
  aiService: claudeAi,
  circuitBreakerRepo: cbRepo,
  bulkheadQueue: bulkheadQueue
});

const reviewDraftUseCase = new ReviewDraftCourseUseCase({
  courseRepository: courseRepo
});

const tenantUseCase = new TenantThemingUseCase({
  tenantRepository: tenantRepo
});

const canaryUseCase = new CanaryRoutingUseCase({
  canaryConfigRepository: canaryRepo
});

// 3. Inicializar datos semilla en DynamoDB
await populateInitialData({ tenantRepo, userRepo, courseRepo });

// 4. Helper para responder JSON con cabeceras CORS
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// 5. Servidor HTTP
const server = http.createServer(async (req, res) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:4000'}`);
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams.entries());
  const tenantIdHeader = req.headers['x-tenant-id'] || query.tenantId || 'alumco';

  try {
    // ---- ENDPOINT RAÍZ / HEALTH CHECK ----
    if ((pathname === '/' || pathname === '/api') && req.method === 'GET') {
      return sendJson(res, 200, {
        status: 'ONLINE',
        servicio: 'API Serverless Alumco / Clean Architecture',
        mensaje: 'El backend está operando correctamente.',
        frontendUrl: 'http://localhost:5173',
        instrucciones: 'Para interactuar con la interfaz gráfica abre http://localhost:5173 en tu navegador (ejecutando npm run dev en /frontend).'
      });
    }
    // ---- ENDPOINTS DE TENANTS & THEMING ----
    if (pathname === '/api/tenants' && req.method === 'GET') {
      const tenants = await tenantUseCase.listTenants();
      return sendJson(res, 200, tenants);
    }

    if (pathname.startsWith('/api/tenants/') && req.method === 'GET') {
      const tid = pathname.replace('/api/tenants/', '');
      const tenant = await tenantUseCase.getTheme(tid);
      return sendJson(res, 200, tenant);
    }

    if (pathname.startsWith('/api/tenants/') && req.method === 'PUT') {
      const tid = pathname.replace('/api/tenants/', '');
      const body = await parseBody(req);
      const updated = await tenantUseCase.updateTheme(tid, body);
      return sendJson(res, 200, updated);
    }

    // ---- ENDPOINTS DE USUARIOS Y ROLES ----
    if (pathname === '/api/users' && req.method === 'GET') {
      const tid = query.tenantId || tenantIdHeader;
      const users = await userRepo.listByTenantAndSede(tid, query.sede);
      return sendJson(res, 200, users);
    }

    if (pathname === '/api/users' && req.method === 'POST') {
      const body = await parseBody(req);
      const tid = body.tenantId || tenantIdHeader;
      const newUser = new User({
        id: body.id || `usr_${Date.now()}`,
        tenantId: tid,
        name: body.name,
        email: body.email,
        role: body.role || User.ROLES.COLABORADOR,
        sede: body.sede || 'ELEAM Hualpén (Biobío)',
        cargo: body.cargo || 'Colaborador en Inducción'
      });
      await userRepo.save(newUser);
      return sendJson(res, 201, newUser);
    }

    // ---- ENDPOINTS DE CURSOS ----
    if (pathname === '/api/courses' && req.method === 'GET') {
      const tid = query.tenantId || tenantIdHeader;
      const courses = await courseRepo.listByTenant(tid, query.estado);
      return sendJson(res, 200, courses);
    }

    if (pathname.startsWith('/api/courses/') && req.method === 'GET') {
      const courseId = pathname.replace('/api/courses/', '');
      const tid = query.tenantId || tenantIdHeader;
      const course = await courseRepo.getById(tid, courseId);
      if (!course) return sendJson(res, 404, { error: 'Curso no encontrado' });
      return sendJson(res, 200, course);
    }

    // ---- WORKFLOW IA: GENERAR CURSO (Circuit Breaker + Bulkhead) ----
    if (pathname === '/api/courses/generate-ai' && req.method === 'POST') {
      const body = await parseBody(req);
      const tid = body.tenantId || tenantIdHeader;
      const result = await generateCourseUseCase.execute({
        tenantId: tid,
        pdfFilename: body.filename || 'Protocolo_Seguridad_2026.pdf',
        pdfContentOrText: body.content || '',
        creadoPor: body.creadoPor || 'usr_jefatura',
        profesorRevisorId: body.profesorRevisorId || 'usr_profesor'
      });
      return sendJson(res, result.status === 'ERROR' ? 500 : 200, result);
    }

    // ---- HUMAN-IN-THE-LOOP: REVISAR BORRADOR PROFESOR ----
    if (pathname === '/api/courses/review-draft' && req.method === 'POST') {
      const body = await parseBody(req);
      const tid = body.tenantId || tenantIdHeader;
      const result = await reviewDraftUseCase.execute({
        tenantId: tid,
        courseId: body.courseId,
        profesorId: body.profesorId || 'usr_profesor',
        modulosModificados: body.modulos,
        preguntasModificadas: body.preguntas,
        accion: body.accion || 'APROBAR' // 'APROBAR' o 'GUARDAR'
      });
      return sendJson(res, 200, result);
    }

    // ---- RENDIR EVALUACIÓN (Control 2 intentos, 70% corte, Certificado, SES Admin) ----
    if (pathname === '/api/evaluations/submit' && req.method === 'POST') {
      const body = await parseBody(req);
      const tid = body.tenantId || tenantIdHeader;
      const result = await submitEvaluationUseCase.execute({
        tenantId: tid,
        userId: body.userId,
        courseId: body.courseId,
        respuestas: body.respuestas || {}
      });
      return sendJson(res, 200, result);
    }

    // ---- CERTIFICADOS EMITIDOS ----
    if (pathname === '/api/certificates' && req.method === 'GET') {
      const tid = query.tenantId || tenantIdHeader;
      const certs = await certRepo.getByUserId(tid, query.userId);
      return sendJson(res, 200, certs);
    }

    // ---- REPORTES DE AVANCE POR SEDE (ADMIN & JEFATURA) ----
    if (pathname === '/api/reports/advance' && req.method === 'GET') {
      const tid = query.tenantId || tenantIdHeader;
      const users = await userRepo.listByTenantAndSede(tid);
      const attempts = await attemptRepo.listAllAttempts(tid);

      const statsBySede = {};
      users.forEach(u => {
        if (!statsBySede[u.sede]) {
          statsBySede[u.sede] = { totalColaboradores: 0, evaluados: 0, aprobados: 0, reprobados: 0 };
        }
        statsBySede[u.sede].totalColaboradores++;

        const userAttempts = attempts.filter(a => a.userId === u.id);
        if (userAttempts.length > 0) {
          statsBySede[u.sede].evaluados++;
          const hasPassed = userAttempts.some(a => a.aprobado);
          if (hasPassed) {
            statsBySede[u.sede].aprobados++;
          } else if (userAttempts.length >= 2) {
            statsBySede[u.sede].reprobados++;
          }
        }
      });

      return sendJson(res, 200, {
        tenantId: tid,
        totalColaboradoresRegistrados: users.length,
        statsBySede,
        recentNotifications: sesNotification.getRecentNotifications(tid)
      });
    }

    // ---- PATRÓN RESILIENCIA: CIRCUIT BREAKER TELEMETRÍA & CONTROL ----
    if (pathname === '/api/resilience/circuit-breaker' && req.method === 'GET') {
      const cbState = await cbRepo.getState('CLAUDE_API');
      const bulkheadStatus = bulkheadQueue.getStatus();
      return sendJson(res, 200, {
        circuitBreaker: {
          serviceName: cbState.serviceName,
          state: cbState.state,
          failureCount: cbState.failureCount,
          failureThreshold: cbState.failureThreshold,
          cooldownSeconds: cbState.cooldownSeconds,
          lastFailureTime: cbState.lastFailureTime,
          isCallPermitted: cbState.isCallPermitted()
        },
        bulkhead: bulkheadStatus
      });
    }

    if (pathname === '/api/resilience/circuit-breaker/toggle' && req.method === 'POST') {
      const body = await parseBody(req);
      const cbState = await cbRepo.getState('CLAUDE_API');

      if (body.action === 'FORCE_OPEN') {
        cbState.state = 'OPEN';
        cbState.failureCount = 5;
        cbState.lastFailureTime = new Date().toISOString();
      } else if (body.action === 'RESET') {
        cbState.recordSuccess();
      } else if (body.action === 'SIMULATE_FAILURE') {
        cbState.recordFailure();
      }

      await cbRepo.saveState(cbState);
      return sendJson(res, 200, {
        message: `Estado actualizado: ${cbState.state}`,
        cbState
      });
    }

    // ---- DESPLIEGUE CANARIO: TELEMETRÍA Y ENRUTAMIENTO ----
    if (pathname === '/api/canary/status' && req.method === 'GET') {
      const canaryData = await canaryUseCase.getCanaryStatus();
      return sendJson(res, 200, canaryData);
    }

    if (pathname === '/api/canary/weight' && req.method === 'POST') {
      const body = await parseBody(req);
      const updated = await canaryUseCase.updateCanaryWeight(body.weight);
      return sendJson(res, 200, updated);
    }

    if (pathname === '/api/canary/route' && req.method === 'POST') {
      const body = await parseBody(req);
      const decision = await canaryUseCase.routeRequest(body.userId, body.tenantId);
      return sendJson(res, 200, decision);
    }

    // 404 No encontrado
    return sendJson(res, 404, { error: `Endpoint no encontrado: ${req.method} ${pathname}` });

  } catch (err) {
    console.error('Error interno en el servidor:', err);
    return sendJson(res, 500, { error: err.message || 'Error interno del servidor' });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Backend Serverless Alumco / Multi-Tenant activo en http://localhost:${PORT}`);
  console.log(`✨ DynamoDB NoSQL listo | Clean Architecture | Circuit Breaker & Bulkhead configurados`);
});
