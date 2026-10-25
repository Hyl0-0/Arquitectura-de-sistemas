import { Course } from '../domain/entities/Course.js';
import { User } from '../domain/entities/User.js';
import { Tenant } from '../domain/entities/Tenant.js';
import { Attempt, Certificate, CircuitBreakerState } from '../domain/entities/ResilienceAndAssessments.js';

export class DynamoDbTenantRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  async getById(tenantId) {
    const item = await this.db.getItem(`TENANT#${tenantId}`, 'METADATA');
    if (!item) return null;
    return new Tenant({ ...item, id: item.tenantId });
  }

  async save(tenant) {
    const item = {
      PK: `TENANT#${tenant.id}`,
      SK: 'METADATA',
      tenantId: tenant.id,
      name: tenant.name,
      tagline: tenant.tagline,
      logoUrl: tenant.logoUrl,
      faviconUrl: tenant.faviconUrl,
      colors: tenant.colors,
      sedes: tenant.sedes,
      createdAt: tenant.createdAt
    };
    await this.db.putItem(item);
    return tenant;
  }

  async listAll() {
    const items = await this.db.scanBySkPrefix('METADATA');
    return items.map(it => new Tenant({ ...it, id: it.tenantId }));
  }
}

export class DynamoDbCourseRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  async getById(tenantId, courseId) {
    const item = await this.db.getItem(`TENANT#${tenantId}`, `COURSE#${courseId}`);
    if (!item) return null;
    return new Course({ ...item, id: item.courseId });
  }

  async save(course) {
    const item = {
      PK: `TENANT#${course.tenantId}`,
      SK: `COURSE#${course.id}`,
      courseId: course.id,
      tenantId: course.tenantId,
      titulo: course.titulo,
      descripcion: course.descripcion,
      origen: course.origen,
      estado: course.estado,
      profesorRevisorId: course.profesorRevisorId,
      creadoPor: course.creadoPor,
      modulos: course.modulos,
      evaluacion: course.evaluacion,
      createdAt: course.createdAt,
      aprobadoAt: course.aprobadoAt,
      version: course.version
    };
    await this.db.putItem(item);
    return course;
  }

  async listByTenant(tenantId, estado = null) {
    const items = await this.db.queryByPk(`TENANT#${tenantId}`, 'COURSE#');
    let courses = items.map(it => new Course({ ...it, id: it.courseId }));
    if (estado) {
      courses = courses.filter(c => c.estado === estado);
    }
    return courses;
  }
}

export class DynamoDbUserRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  async getById(tenantId, userId) {
    const item = await this.db.getItem(`TENANT#${tenantId}`, `USER#${userId}`);
    if (!item) return null;
    return new User({ ...item, id: item.userId });
  }

  async save(user) {
    const item = {
      PK: `TENANT#${user.tenantId}`,
      SK: `USER#${user.id}`,
      userId: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      sede: user.sede,
      cargo: user.cargo,
      activo: user.activo
    };
    await this.db.putItem(item);
    return user;
  }

  async listByTenantAndSede(tenantId, sede = null) {
    const items = await this.db.queryByPk(`TENANT#${tenantId}`, 'USER#');
    let users = items.map(it => new User({ ...it, id: it.userId }));
    if (sede) {
      users = users.filter(u => u.sede === sede);
    }
    return users;
  }
}

export class DynamoDbAttemptRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  async getByUserAndCourse(userId, courseId) {
    const items = await this.db.queryByPk(`USER#${userId}`, `ATTEMPT#${courseId}#`);
    return items.map(it => new Attempt({ ...it, id: it.attemptId }));
  }

  async save(attempt) {
    const item = {
      PK: `USER#${attempt.userId}`,
      SK: `ATTEMPT#${attempt.courseId}#${attempt.intentoNro}`,
      attemptId: attempt.id,
      tenantId: attempt.tenantId,
      userId: attempt.userId,
      courseId: attempt.courseId,
      intentoNro: attempt.intentoNro,
      respuestas: attempt.respuestas,
      puntaje: attempt.puntaje,
      aprobado: attempt.aprobado,
      fecha: attempt.fecha
    };
    await this.db.putItem(item);
    return attempt;
  }

  async listAllAttempts(tenantId) {
    const items = await this.db.scanBySkPrefix('ATTEMPT#');
    return items.filter(i => !tenantId || i.tenantId === tenantId);
  }
}

export class DynamoDbCertificateRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  async save(cert) {
    const item = {
      PK: `TENANT#${cert.tenantId}`,
      SK: `CERT#${cert.id}`,
      certId: cert.id,
      tenantId: cert.tenantId,
      userId: cert.userId,
      userName: cert.userName,
      courseId: cert.courseId,
      courseTitle: cert.courseTitle,
      attemptId: cert.attemptId,
      puntaje: cert.puntaje,
      codigoVerificacion: cert.codigoVerificacion,
      fechaEmision: cert.fechaEmision,
      s3PdfUrl: cert.s3PdfUrl
    };
    await this.db.putItem(item);
    return cert;
  }

  async getByUserId(tenantId, userId) {
    const items = await this.db.queryByPk(`TENANT#${tenantId}`, 'CERT#');
    return items.filter(c => c.userId === userId).map(it => new Certificate({ ...it, id: it.certId }));
  }
}

export class DynamoDbCircuitBreakerRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  async getState(serviceName = 'CLAUDE_API') {
    const item = await this.db.getItem('SYSTEM#CIRCUIT_BREAKER', `SERVICE#${serviceName}`);
    if (!item) {
      return new CircuitBreakerState({ serviceName });
    }
    return new CircuitBreakerState(item);
  }

  async saveState(cbState) {
    const item = {
      PK: 'SYSTEM#CIRCUIT_BREAKER',
      SK: `SERVICE#${cbState.serviceName}`,
      serviceName: cbState.serviceName,
      state: cbState.state,
      failureCount: cbState.failureCount,
      lastFailureTime: cbState.lastFailureTime,
      cooldownSeconds: cbState.cooldownSeconds,
      failureThreshold: cbState.failureThreshold
    };
    await this.db.putItem(item);
    return cbState;
  }
}
