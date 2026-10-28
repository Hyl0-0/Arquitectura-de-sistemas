// Domain Entity: Attempt (Intento de Evaluación)
export class Attempt {
  constructor({
    id,
    tenantId,
    userId,
    courseId,
    intentoNro, // 1 o 2
    respuestas = {},
    puntaje = 0,
    aprobado = false,
    fecha = new Date().toISOString()
  }) {
    if (!id || !userId || !courseId || !intentoNro) {
      throw new Error('Attempt requires id, userId, courseId, and intentoNro');
    }
    if (intentoNro > 2) {
      throw new Error('Superado el número máximo de intentos permitidos (2)');
    }
    this.id = id;
    this.tenantId = tenantId;
    this.userId = userId;
    this.courseId = courseId;
    this.intentoNro = intentoNro;
    this.respuestas = respuestas;
    this.puntaje = puntaje;
    this.aprobado = aprobado;
    this.fecha = fecha;
  }
}

// Domain Entity: Certificate (Certificado Digital)
export class Certificate {
  constructor({
    id,
    tenantId,
    userId,
    userName,
    courseId,
    courseTitle,
    attemptId,
    puntaje,
    codigoVerificacion,
    fechaEmision = new Date().toISOString(),
    s3PdfUrl = ''
  }) {
    this.id = id;
    this.tenantId = tenantId;
    this.userId = userId;
    this.userName = userName;
    this.courseId = courseId;
    this.courseTitle = courseTitle;
    this.attemptId = attemptId;
    this.puntaje = puntaje;
    this.codigoVerificacion = codigoVerificacion;
    this.fechaEmision = fechaEmision;
    this.s3PdfUrl = s3PdfUrl;
  }
}

// Domain Entity: CircuitBreakerState (Patrón Circuit Breaker en DynamoDB)
export class CircuitBreakerState {
  static STATES = {
    CLOSED: 'CLOSED',       // Funcionando normal
    OPEN: 'OPEN',           // Falló >= 5 veces, llamadas bloqueadas
    HALF_OPEN: 'HALF_OPEN'  // Periodo de prueba de 1 llamada
  };

  constructor({
    serviceName = 'CLAUDE_API',
    state = CircuitBreakerState.STATES.CLOSED,
    failureCount = 0,
    lastFailureTime = null,
    cooldownSeconds = 60, // 60 segundos de cooldown según el informe
    failureThreshold = 5  // 5 fallos consecutivos según el informe
  }) {
    this.serviceName = serviceName;
    this.state = state;
    this.failureCount = failureCount;
    this.lastFailureTime = lastFailureTime;
    this.cooldownSeconds = cooldownSeconds;
    this.failureThreshold = failureThreshold;
  }

  isCallPermitted() {
    if (this.state === CircuitBreakerState.STATES.CLOSED) {
      return true;
    }
    if (this.state === CircuitBreakerState.STATES.OPEN) {
      const now = Date.now();
      const elapsedSeconds = (now - new Date(this.lastFailureTime).getTime()) / 1000;
      if (elapsedSeconds >= this.cooldownSeconds) {
        this.state = CircuitBreakerState.STATES.HALF_OPEN;
        return true;
      }
      return false; // Circuito aún abierto
    }
    if (this.state === CircuitBreakerState.STATES.HALF_OPEN) {
      return true;
    }
    return false;
  }

  // Estado "efectivo": lo que el sistema haría si llegara una llamada ahora.
  // No modifica nada; solo sirve para mostrar el estado real en el panel.
  getEffectiveState() {
    if (this.state === CircuitBreakerState.STATES.OPEN && this.lastFailureTime) {
      const elapsedSeconds = (Date.now() - new Date(this.lastFailureTime).getTime()) / 1000;
      if (elapsedSeconds >= this.cooldownSeconds) {
        return CircuitBreakerState.STATES.HALF_OPEN;
      }
    }
    return this.state;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = CircuitBreakerState.STATES.CLOSED;
    this.lastFailureTime = null;
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = new Date().toISOString();
    if (this.failureCount >= this.failureThreshold || this.state === CircuitBreakerState.STATES.HALF_OPEN) {
      this.state = CircuitBreakerState.STATES.OPEN;
    }
  }
}
