import test from 'node:test';
import assert from 'node:assert/strict';

import { Course } from '../src/domain/entities/Course.js';
import { Evaluation } from '../src/domain/entities/Evaluation.js';
import { CircuitBreakerState } from '../src/domain/entities/ResilienceAndAssessments.js';
import { SubmitEvaluationUseCase } from '../src/usecases/SubmitEvaluationUseCase.js';

// Mocks en memoria para probar el caso de uso
class MockCourseRepository {
  constructor(course) {
    this.course = course;
  }
  async getById(tenantId, courseId) {
    if (this.course && this.course.id === courseId) return this.course;
    return null;
  }
}

class MockAttemptRepository {
  constructor() {
    this.attempts = [];
  }
  async getByUserAndCourse(userId, courseId) {
    return this.attempts.filter(a => a.userId === userId && a.courseId === courseId);
  }
  async save(attempt) {
    this.attempts.push(attempt);
    return attempt;
  }
}

class MockCertificateRepository {
  constructor() {
    this.certificates = [];
  }
  async save(cert) {
    this.certificates.push(cert);
    return cert;
  }
}

class MockUserRepository {
  async getById(tenantId, userId) {
    return { id: userId, name: 'Colaborador Test', email: 'test@alumco.cl', sede: 'ELEAM Hualpén' };
  }
}

class MockNotificationService {
  constructor() {
    this.adminAlerts = [];
  }
  async notifyAdminFailure(data) {
    this.adminAlerts.push(data);
    return { success: true };
  }
}

test('CircuitBreakerState: Transición de estados y tolerancia a fallos', () => {
  const cb = new CircuitBreakerState({
    serviceName: 'CLAUDE_API',
    failureThreshold: 5,
    cooldownSeconds: 60
  });

  assert.equal(cb.state, 'CLOSED');
  assert.equal(cb.isCallPermitted(), true);

  // 4 fallos no abren el circuito
  for (let i = 0; i < 4; i++) {
    cb.recordFailure();
  }
  assert.equal(cb.state, 'CLOSED');
  assert.equal(cb.isCallPermitted(), true);

  // 5° fallo abre el circuito
  cb.recordFailure();
  assert.equal(cb.state, 'OPEN');
  assert.equal(cb.isCallPermitted(), false);

  // Simular transcurso del tiempo de cooldown (enfriamiento)
  cb.lastFailureTime = new Date(Date.now() - 65 * 1000).toISOString();
  assert.equal(cb.isCallPermitted(), true);
  assert.equal(cb.state, 'HALF_OPEN');

  // En HALF_OPEN, si tiene éxito se cierra
  cb.recordSuccess();
  assert.equal(cb.state, 'CLOSED');
  assert.equal(cb.failureCount, 0);
});

test('Course: Validaciones de publicación y transición pedagógica', () => {
  const course = new Course({
    id: 'c1',
    tenantId: 'alumco',
    titulo: 'Curso Seguridad',
    modulos: [{ id: 'm1', titulo: 'M1', contenido: 'Contenido 1' }],
    evaluacion: new Evaluation({
      id: 'e1',
      courseId: 'c1',
      preguntas: [{ id: 'q1', enunciado: 'P1', opciones: ['A', 'B'], respuestaCorrecta: 0 }],
      puntajeAprobacion: 70
    })
  });

  assert.equal(course.estado, Course.STATUS.BORRADOR);
  assert.equal(course.estaListoParaPublicar(), true);

  course.aprobarYPublicar('usr_profesor_1');
  assert.equal(course.estado, Course.STATUS.PUBLICADO);
  assert.equal(course.profesorRevisorId, 'usr_profesor_1');
  assert.ok(course.aprobadoAt);
});

test('SubmitEvaluationUseCase: Regla del 70% y Certificado Digital', async () => {
  const course = new Course({
    id: 'c_test',
    tenantId: 'alumco',
    titulo: 'Inducción ELEAM',
    estado: Course.STATUS.PUBLICADO,
    modulos: [{ id: 'm1', titulo: 'M1', contenido: 'ABC' }],
    evaluacion: {
      id: 'e_test',
      puntajeAprobacion: 70,
      preguntas: [
        { id: 'q1', respuestaCorrecta: 0 },
        { id: 'q2', respuestaCorrecta: 1 },
        { id: 'q3', respuestaCorrecta: 2 },
        { id: 'q4', respuestaCorrecta: 3 }
      ]
    }
  });

  const courseRepo = new MockCourseRepository(course);
  const attemptRepo = new MockAttemptRepository();
  const certRepo = new MockCertificateRepository();
  const userRepo = new MockUserRepository();
  const notifService = new MockNotificationService();

  const useCase = new SubmitEvaluationUseCase({
    attemptRepository: attemptRepo,
    courseRepository: courseRepo,
    certificateRepository: certRepo,
    notificationService: notifService,
    userRepository: userRepo
  });

  // Colaborador responde 3 de 4 correctas = 75% (Aprobado >= 70%)
  const resAprobado = await useCase.execute({
    tenantId: 'alumco',
    userId: 'usr_felipe',
    courseId: 'c_test',
    respuestas: { q1: 0, q2: 1, q3: 2, q4: 0 } // q4 incorrecta
  });

  assert.equal(resAprobado.aprobado, true);
  assert.equal(resAprobado.puntaje, 75);
  assert.equal(resAprobado.attemptNro, 1);
  assert.ok(resAprobado.certificado);
  assert.equal(certRepo.certificates.length, 1);
  assert.ok(certRepo.certificates[0].codigoVerificacion.startsWith('CERT-ALUM-'));
});

test('SubmitEvaluationUseCase: Límite de 2 intentos y Alerta de Escalamiento SES', async () => {
  const course = new Course({
    id: 'c_test_fail',
    tenantId: 'alumco',
    titulo: 'Inducción ELEAM',
    estado: Course.STATUS.PUBLICADO,
    modulos: [{ id: 'm1', titulo: 'M1', contenido: 'ABC' }],
    evaluacion: {
      id: 'e_test_fail',
      puntajeAprobacion: 70,
      preguntas: [
        { id: 'q1', respuestaCorrecta: 0 },
        { id: 'q2', respuestaCorrecta: 1 }
      ]
    }
  });

  const courseRepo = new MockCourseRepository(course);
  const attemptRepo = new MockAttemptRepository();
  const certRepo = new MockCertificateRepository();
  const userRepo = new MockUserRepository();
  const notifService = new MockNotificationService();

  const useCase = new SubmitEvaluationUseCase({
    attemptRepository: attemptRepo,
    courseRepository: courseRepo,
    certificateRepository: certRepo,
    notificationService: notifService,
    userRepository: userRepo
  });

  // 1° Intento: Reprobado (0%)
  const res1 = await useCase.execute({
    tenantId: 'alumco',
    userId: 'usr_ignacio',
    courseId: 'c_test_fail',
    respuestas: { q1: 1, q2: 0 }
  });
  assert.equal(res1.aprobado, false);
  assert.equal(res1.attemptNro, 1);
  assert.equal(res1.intentosRestantes, 1);
  assert.equal(notifService.adminAlerts.length, 0);

  // 2° Intento: Reprobado (50%) -> Dispara notificación SES a Administración
  const res2 = await useCase.execute({
    tenantId: 'alumco',
    userId: 'usr_ignacio',
    courseId: 'c_test_fail',
    respuestas: { q1: 0, q2: 0 }
  });
  assert.equal(res2.aprobado, false);
  assert.equal(res2.attemptNro, 2);
  assert.equal(res2.intentosRestantes, 0);
  assert.equal(notifService.adminAlerts.length, 1);
  assert.equal(notifService.adminAlerts[0].colaboradorNombre, 'Colaborador Test');

  // 3° Intento: Bloqueado por regla de negocio (Error 403)
  await assert.rejects(
    async () => {
      await useCase.execute({
        tenantId: 'alumco',
        userId: 'usr_ignacio',
        courseId: 'c_test_fail',
        respuestas: { q1: 0, q2: 1 }
      });
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /máximo de 2 intentos/);
      return true;
    }
  );
});
