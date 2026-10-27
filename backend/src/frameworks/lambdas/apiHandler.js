import { User } from '../../domain/entities/User.js';
import { DynamoDbClientWrapper } from '../../adapters/DynamoDbAdapter.js';
import {
  DynamoDbTenantRepository,
  DynamoDbCourseRepository,
  DynamoDbUserRepository,
  DynamoDbAttemptRepository,
  DynamoDbCertificateRepository,
  DynamoDbCircuitBreakerRepository
} from '../../adapters/DynamoDbRepositories.js';
import {
  BulkheadQueue,
  SesNotificationService,
  ClaudeAiService,
  CanaryConfigRepository
} from '../../adapters/ServicesAndCanary.js';
import { SubmitEvaluationUseCase } from '../../usecases/SubmitEvaluationUseCase.js';
import { GenerateCourseFromPdfUseCase, ReviewDraftCourseUseCase, CreateManualCourseUseCase } from '../../usecases/AiAndCourseWorkflows.js';
import { TenantThemingUseCase, CanaryRoutingUseCase } from '../../usecases/TenantAndCanaryUseCases.js';
import { populateInitialData } from '../seedData.js';

// Adaptadores e Infraestructura persistentes en memoria del runtime de Lambda
const dbClient = new DynamoDbClientWrapper();
const tenantRepo = new DynamoDbTenantRepository(dbClient);
const courseRepo = new DynamoDbCourseRepository(dbClient);
const userRepo = new DynamoDbUserRepository(dbClient);
const attemptRepo = new DynamoDbAttemptRepository(dbClient);
const certRepo = new DynamoDbCertificateRepository(dbClient);
const cbRepo = new DynamoDbCircuitBreakerRepository(dbClient);

const bulkheadQueue = new BulkheadQueue(2);
const sesNotification = new SesNotificationService({ maxRetries: 3, baseDelayMs: 150 });
const claudeAi = new ClaudeAiService();
const canaryRepo = new CanaryConfigRepository(dbClient);

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

const createManualCourseUseCase = new CreateManualCourseUseCase({
  courseRepository: courseRepo
});

const tenantUseCase = new TenantThemingUseCase({
  tenantRepository: tenantRepo
});

const canaryUseCase = new CanaryRoutingUseCase({
  canaryConfigRepository: canaryRepo
});

let isSeeded = false;

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Inicializar semillas en DynamoDB si es primera invocación
  if (!isSeeded) {
    try {
      await populateInitialData({ tenantRepo, userRepo, courseRepo });
      isSeeded = true;
    } catch (e) {
      console.warn('Advertencia en carga inicial de semillas:', e.message);
    }
  }

  let pathname = event.path || event.rawPath || '/';
  // Normalizar prefijo de stage (ej: /prod/api -> /api)
  if (pathname.startsWith('/prod')) {
    pathname = pathname.substring(5);
  }
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }

  const query = event.queryStringParameters || {};
  const tenantIdHeader = event.headers?.['x-tenant-id'] || event.headers?.['X-Tenant-Id'] || query.tenantId || 'alumco';

  let body = {};
  if (event.body) {
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch {
      body = {};
    }
  }

  try {
    // ---- HEALTH CHECK / ROOT ----
    if ((pathname === '/' || pathname === '/api') && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'ONLINE',
          servicio: 'API Serverless Alumco / Clean Architecture (AWS Lambda)',
          mensaje: 'El backend serverless está operando correctamente en AWS.'
        })
      };
    }

    // ---- TENANTS & THEMING ----
    if (pathname === '/api/tenants' && method === 'GET') {
      const tenants = await tenantUseCase.listTenants();
      return { statusCode: 200, headers, body: JSON.stringify(tenants) };
    }

    if (pathname.startsWith('/api/tenants/') && method === 'GET') {
      const tid = pathname.replace('/api/tenants/', '');
      const tenant = await tenantUseCase.getTheme(tid);
      return { statusCode: 200, headers, body: JSON.stringify(tenant) };
    }

    if (pathname.startsWith('/api/tenants/') && method === 'PUT') {
      const tid = pathname.replace('/api/tenants/', '');
      const updated = await tenantUseCase.updateTheme(tid, body);
      return { statusCode: 200, headers, body: JSON.stringify(updated) };
    }

    // ---- USUARIOS ----
    if (pathname === '/api/users' && method === 'GET') {
      const tid = query.tenantId || tenantIdHeader;
      const users = await userRepo.listByTenantAndSede(tid, query.sede);
      return { statusCode: 200, headers, body: JSON.stringify(users) };
    }

    if (pathname === '/api/users' && method === 'POST') {
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
      return { statusCode: 201, headers, body: JSON.stringify(newUser) };
    }

    // ---- CURSOS ----
    if (pathname === '/api/courses' && method === 'GET') {
      const tid = query.tenantId || tenantIdHeader;
      const courses = await courseRepo.listByTenant(tid, query.estado);
      return { statusCode: 200, headers, body: JSON.stringify(courses) };
    }

    // ---- CREAR CURSO MANUAL (Profesor o Jefatura) ----
    if (pathname === '/api/courses' && method === 'POST') {
      const tid = body.tenantId || tenantIdHeader;
      try {
        const result = await createManualCourseUseCase.execute({
          tenantId: tid,
          titulo: body.titulo,
          descripcion: body.descripcion,
          modulos: body.modulos,
          preguntas: body.preguntas,
          creadoPor: body.creadoPor || 'usr_profesor'
        });
        return { statusCode: 201, headers, body: JSON.stringify(result) };
      } catch (err) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: err.message }) };
      }
    }

    if (pathname.startsWith('/api/courses/') && method === 'GET') {
      const courseId = pathname.replace('/api/courses/', '');
      const tid = query.tenantId || tenantIdHeader;
      const course = await courseRepo.getById(tid, courseId);
      if (!course) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Curso no encontrado' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify(course) };
    }

    // ---- IA GENERAR CURSO ----
    if (pathname === '/api/courses/generate-ai' && method === 'POST') {
      const tid = body.tenantId || tenantIdHeader;
      const result = await generateCourseUseCase.execute({
        tenantId: tid,
        pdfFilename: body.filename || 'Protocolo_Seguridad_2026.pdf',
        pdfContentOrText: body.content || '',
        creadoPor: body.creadoPor || 'usr_jefatura',
        profesorRevisorId: body.profesorRevisorId || 'usr_profesor'
      });
      return { statusCode: result.status === 'ERROR' ? 500 : 200, headers, body: JSON.stringify(result) };
    }

    // ---- REVISIÓN PROFESOR ----
    if (pathname === '/api/courses/review-draft' && method === 'POST') {
      const tid = body.tenantId || tenantIdHeader;
      const result = await reviewDraftUseCase.execute({
        tenantId: tid,
        courseId: body.courseId,
        profesorId: body.profesorId || 'usr_profesor',
        modulosModificados: body.modulos,
        preguntasModificadas: body.preguntas,
        accion: body.accion || 'APROBAR'
      });
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    // ---- EVALUACIÓN DIRECTA ----
    if (pathname === '/api/evaluations/submit' && method === 'POST') {
      const tid = body.tenantId || tenantIdHeader;
      const result = await submitEvaluationUseCase.execute({
        tenantId: tid,
        userId: body.userId,
        courseId: body.courseId,
        respuestas: body.respuestas || {}
      });
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    // ---- CERTIFICADOS ----
    if (pathname === '/api/certificates' && method === 'GET') {
      const tid = query.tenantId || tenantIdHeader;
      const certs = await certRepo.getByUserId(tid, query.userId);
      return { statusCode: 200, headers, body: JSON.stringify(certs) };
    }

    // ---- REPORTES AVANCE ----
    if (pathname === '/api/reports/advance' && method === 'GET') {
      const tid = query.tenantId || tenantIdHeader;
      // Solo los colaboradores (alumnos) cuentan para el cumplimiento
      const users = (await userRepo.listByTenantAndSede(tid)).filter(u => u.role === User.ROLES.COLABORADOR);
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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          tenantId: tid,
          totalColaboradoresRegistrados: users.length,
          statsBySede,
          recentNotifications: sesNotification.getRecentNotifications(tid)
        })
      };
    }

    // ---- CIRCUIT BREAKER ----
    if (pathname === '/api/resilience/circuit-breaker' && method === 'GET') {
      const cbState = await cbRepo.getState('CLAUDE_API');
      const bulkheadStatus = bulkheadQueue.getStatus();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
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
        })
      };
    }

    if (pathname === '/api/resilience/circuit-breaker/toggle' && method === 'POST') {
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
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: `Estado actualizado: ${cbState.state}`, cbState })
      };
    }

    // ---- CANARY RELEASE ----
    if (pathname === '/api/canary/status' && method === 'GET') {
      const canaryData = await canaryUseCase.getCanaryStatus();
      return { statusCode: 200, headers, body: JSON.stringify(canaryData) };
    }

    if (pathname === '/api/canary/weight' && method === 'POST') {
      const updated = await canaryUseCase.updateCanaryWeight(body.weight);
      return { statusCode: 200, headers, body: JSON.stringify(updated) };
    }

    if (pathname === '/api/canary/route' && method === 'POST') {
      const decision = await canaryUseCase.routeRequest(body.userId, body.tenantId);
      return { statusCode: 200, headers, body: JSON.stringify(decision) };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: `Ruta no encontrada en Serverless API Gateway: ${method} ${pathname}` })
    };

  } catch (error) {
    console.error('Error interno en Lambda:', error);
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Error interno del servidor en AWS Lambda' })
    };
  }
};
