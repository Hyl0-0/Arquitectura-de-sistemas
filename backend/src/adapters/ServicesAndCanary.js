// Implementación del Patrón Bulkhead:
// Aísla la capacidad de procesamiento de IA para que no consuma los recursos que usan los colaboradores al rendir exámenes.
export class BulkheadQueue {
  constructor(maxConcurrency = 2) {
    this.maxConcurrency = maxConcurrency;
    this.currentRunning = 0;
    this.queue = [];
  }

  async execute(taskFn) {
    if (this.currentRunning >= this.maxConcurrency) {
      console.log(`[BULKHEAD] Concurrencia máxima alcanzada (${this.maxConcurrency}). Encolando tarea en Bulkhead...`);
      await new Promise(resolve => this.queue.push(resolve));
    }

    this.currentRunning++;
    try {
      return await taskFn();
    } finally {
      this.currentRunning--;
      if (this.queue.length > 0) {
        const nextInQueue = this.queue.shift();
        nextInQueue();
      }
    }
  }

  getStatus() {
    return {
      maxConcurrency: this.maxConcurrency,
      currentRunning: this.currentRunning,
      waitingInQueue: this.queue.length
    };
  }
}

// Implementación del Patrón Retry con Backoff Exponencial (Amazon SES)
export class SesNotificationService {
  constructor({ maxRetries = 3, baseDelayMs = 200 } = {}) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.sentEmails = [];
  }

  async notifyAdminFailure({ tenantId, colaboradorNombre, colaboradorEmail, sede, cursoTitulo, puntaje }) {
    const subject = `[ALERTA ESCALAMIENTO] Segundo Intento Reprobado: ${colaboradorNombre} (${sede})`;
    const body = `El colaborador ${colaboradorNombre} (${colaboradorEmail}) de la sede ${sede} ha reprobado su segundo intento en el curso "${cursoTitulo}" con nota ${puntaje}%. Se requiere intervención o reprogramación de inducción.`;

    return await this.sendWithRetry({
      to: `admin@${tenantId}.cl`,
      subject,
      body,
      type: 'ADMIN_ESCALATION'
    });
  }

  async sendWithRetry(emailData) {
    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        // En producción se utiliza SendEmailCommand de @aws-sdk/client-ses
        // Aquí simulamos la llamada y registramos el log con timestamp
        console.log(`[RETRY - SES] Intento ${attempt + 1}/${this.maxRetries + 1} enviando notificación a ${emailData.to}`);
        
        const record = {
          id: `email_${Date.now()}`,
          ...emailData,
          sentAt: new Date().toISOString(),
          attemptsNeeded: attempt + 1
        };
        this.sentEmails.push(record);
        return { success: true, record };
      } catch (err) {
        attempt++;
        if (attempt > this.maxRetries) {
          console.error(`[RETRY - SES] Falló tras ${this.maxRetries} reintentos:`, err.message);
          throw new Error(`Fallo en el servicio SES tras ${this.maxRetries} reintentos: ${err.message}`);
        }
        const delay = this.baseDelayMs * Math.pow(2, attempt);
        console.warn(`[RETRY - SES] Fallo transitorio. Reintentando en ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  getRecentNotifications(tenantId) {
    return this.sentEmails;
  }
}

// Adaptador para el Servicio de Inteligencia Artificial (Claude API)
// Workflow secuencial con Human-in-the-Loop según el informe
export class ClaudeAiService {
  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    this.apiKey = apiKey;
  }

  async generateCourseFromDocument({ filename, content, tenantId }) {
    // Si hay API key real configurada, se podría conectar directamente a la API de Claude
    // Proporcionamos un motor de extracción inteligente que simula el resultado del workflow de Claude
    console.log(`[CLAUDE AI SERVICE] Procesando documento "${filename}" para tenant "${tenantId}"...`);

    // Simulamos latencia realista de análisis de PDF y tokens de Claude
    await new Promise(r => setTimeout(r, 800));

    // Si el contenido contiene la palabra 'FORCE_FAIL', simulamos una falla para probar el Circuit Breaker
    if (content && content.includes('FORCE_FAIL')) {
      throw new Error('Claude API 503 Overloaded: Simulación de fallo para activar el Circuit Breaker');
    }

    const docNameClean = filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    return {
      titulo: `Inducción y Protocolo: ${docNameClean}`,
      descripcion: `Curso estructurado automáticamente a partir del documento oficial ${filename}. Contiene directrices de seguridad, normativa y procedimientos operativos.`,
      modulos: [
        {
          id: 'mod_1',
          orden: 1,
          titulo: 'Módulo 1: Introducción y Normativa Institucional',
          contenido: `Este módulo cubre los fundamentos descritos en ${filename}, estableciendo los estándares obligatorios de operación, los roles del personal y el alcance de las políticas internas.`,
          tiempoEstimado: '15 min'
        },
        {
          id: 'mod_2',
          orden: 2,
          titulo: 'Módulo 2: Procedimientos de Operación y Seguridad',
          contenido: 'Instrucciones paso a paso para el cumplimiento de protocolos, prevención de incidentes, uso de equipo de protección y medidas de contingencia.',
          tiempoEstimado: '25 min'
        },
        {
          id: 'mod_3',
          orden: 3,
          titulo: 'Módulo 3: Gestión de Incidentes y Escalabilidad',
          contenido: 'Protocolos de comunicación ante irregularidades, canales oficiales de notificación y procedimientos de escalamiento hacia jefaturas.',
          tiempoEstimado: '20 min'
        }
      ],
      preguntas: [
        {
          id: 'p1',
          enunciado: '¿Cuál es el primer paso obligatorio estipulado en el protocolo antes de iniciar operaciones?',
          opciones: [
            'Inspección visual y verificación de los elementos de protección personal (EPP)',
            'Iniciar labores de inmediato para cumplir los plazos',
            'Delegar la revisión al supervisor al final del turno',
            'Omitir la lista de chequeo si no hay incidentes previos'
          ],
          respuestaCorrecta: 0
        },
        {
          id: 'p2',
          enunciado: 'Ante una condición de riesgo o falla en el procedimiento estándar, ¿qué acción corresponde según la normativa?',
          opciones: [
            'Continuar la labor con precaución',
            'Detener la actividad inmediatamente y notificar a la jefatura directa',
            'Intentar reparar el equipo sin autorización',
            'Esperar al término de la jornada laboral'
          ],
          respuestaCorrecta: 1
        },
        {
          id: 'p3',
          enunciado: '¿Cuál es el umbral de aprobación requerido para certificar esta inducción institucional?',
          opciones: [
            '50% de respuestas correctas',
            '60% de respuestas correctas',
            '70% de respuestas correctas',
            '100% de respuestas correctas únicamente'
          ],
          respuestaCorrecta: 2
        },
        {
          id: 'p4',
          enunciado: '¿Cuántos intentos máximos permite la plataforma antes de escalar la situación con la administración?',
          opciones: [
            '1 intento',
            '2 intentos',
            '3 intentos',
            'Intentos ilimitados'
          ],
          respuestaCorrecta: 1
        }
      ]
    };
  }
}

// Repositorio en memoria/DynamoDB para la configuración de Canary Deployments
export class CanaryConfigRepository {
  constructor(dbClient) {
    this.db = dbClient;
    this.config = {
      weight: 10, // 10% canary por defecto
      activeVersion: 'v1.1.0-canary',
      stableVersion: 'v1.0.0-stable',
      pilotTenants: [],
      canaryHealth: 'HEALTHY',
      errorRateCanary: 0.2,
      errorRateStable: 0.1,
      totalRequestsRouted: 1420
    };
  }

  async getConfig() {
    return this.config;
  }

  async updateWeight(weight) {
    this.config.weight = weight;
    return this.config;
  }

  async addPilotTenant(tenantId) {
    if (!this.config.pilotTenants.includes(tenantId)) {
      this.config.pilotTenants.push(tenantId);
    }
    return this.config;
  }
}
