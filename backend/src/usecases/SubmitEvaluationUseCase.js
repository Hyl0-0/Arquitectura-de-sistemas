import { Attempt, Certificate } from '../domain/entities/ResilienceAndAssessments.js';

export class SubmitEvaluationUseCase {
  constructor({ attemptRepository, courseRepository, certificateRepository, notificationService, userRepository }) {
    this.attemptRepository = attemptRepository;
    this.courseRepository = courseRepository;
    this.certificateRepository = certificateRepository;
    this.notificationService = notificationService;
    this.userRepository = userRepository;
  }

  async execute({ tenantId, userId, courseId, respuestas }) {
    // 1. Obtener el curso y su evaluación
    const course = await this.courseRepository.getById(tenantId, courseId);
    if (!course || !course.evaluacion) {
      throw new Error('Curso o evaluación no encontrada');
    }

    // 2. Obtener intentos previos del colaborador
    const previousAttempts = await this.attemptRepository.getByUserAndCourse(userId, courseId);
    if (previousAttempts.length >= 2) {
      throw new Error('Has alcanzado el límite máximo de 2 intentos permitidos para esta evaluación');
    }

    const currentAttemptNro = previousAttempts.length + 1;

    // 3. Calificar la evaluación
    const evaluacion = course.evaluacion;
    let correctas = 0;
    const preguntas = evaluacion.preguntas || [];
    preguntas.forEach((p, idx) => {
      const qKey = p.id || String(idx);
      if (respuestas[qKey] !== undefined && respuestas[qKey] === p.respuestaCorrecta) {
        correctas++;
      }
    });

    const porcentaje = preguntas.length > 0 ? Math.round((correctas / preguntas.length) * 100) : 0;
    const aprobado = porcentaje >= (evaluacion.puntajeAprobacion || 70);

    // 4. Registrar el intento
    const attempt = new Attempt({
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      userId,
      courseId,
      intentoNro: currentAttemptNro,
      respuestas,
      puntaje: porcentaje,
      aprobado,
      fecha: new Date().toISOString()
    });

    await this.attemptRepository.save(attempt);

    let certificado = null;
    let mensajeNotificacion = null;

    // 5. Reglas de Negocio del informe:
    if (aprobado) {
      // Emisión automática de certificado digital
      const user = await this.userRepository.getById(tenantId, userId);
      const codigoVerif = `CERT-${tenantId.toUpperCase().slice(0, 4)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      certificado = new Certificate({
        id: `cert_${Date.now()}`,
        tenantId,
        userId,
        userName: user ? user.name : 'Colaborador',
        courseId,
        courseTitle: course.titulo,
        attemptId: attempt.id,
        puntaje: porcentaje,
        codigoVerificacion: codigoVerif,
        s3PdfUrl: `https://s3.amazonaws.com/${tenantId}-certificates/${codigoVerif}.pdf`
      });

      await this.certificateRepository.save(certificado);
    } else {
      // Reprobado
      if (currentAttemptNro === 1) {
        mensajeNotificacion = 'Has reprobado tu primer intento. Tienes 1 intento restante disponible.';
      } else if (currentAttemptNro === 2) {
        // Segundo intento reprobado -> Notificación formal por SES al Administrador para escalamiento
        mensajeNotificacion = 'Has reprobado tu segundo y último intento. Se ha notificado a la Administración.';
        const user = await this.userRepository.getById(tenantId, userId);
        await this.notificationService.notifyAdminFailure({
          tenantId,
          colaboradorNombre: user ? user.name : userId,
          colaboradorEmail: user ? user.email : '',
          sede: user ? user.sede : 'Central',
          cursoTitulo: course.titulo,
          puntaje: porcentaje
        });
      }
    }

    return {
      attemptNro: currentAttemptNro,
      puntaje: porcentaje,
      aprobado,
      certificado,
      mensaje: mensajeNotificacion,
      intentosRestantes: 2 - currentAttemptNro
    };
  }
}
