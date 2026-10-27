import { Course } from '../domain/entities/Course.js';
import { Evaluation } from '../domain/entities/Evaluation.js';

export class GenerateCourseFromPdfUseCase {
  constructor({ courseRepository, aiService, circuitBreakerRepo, bulkheadQueue }) {
    this.courseRepository = courseRepository;
    this.aiService = aiService;
    this.circuitBreakerRepo = circuitBreakerRepo;
    this.bulkheadQueue = bulkheadQueue;
  }

  async execute({ tenantId, pdfFilename, pdfContentOrText, creadoPor, profesorRevisorId }) {
    // 1. Consultar estado del Circuit Breaker (persistido en DynamoDB)
    const cbState = await this.circuitBreakerRepo.getState('CLAUDE_API');
    
    if (!cbState.isCallPermitted()) {
      return {
        status: 'CIRCUIT_OPEN',
        message: 'El servicio de IA no está disponible temporalmente por fallos reiterados (Circuit Breaker ABIERTO). Puede crear el curso de forma manual.',
        circuitState: cbState.state,
        cooldownRemaining: cbState.cooldownSeconds
      };
    }

    try {
      // 2. Ejecutar a través del Bulkhead (aislamiento de procesamiento de IA)
      const generatedDraft = await this.bulkheadQueue.execute(async () => {
        return await this.aiService.generateCourseFromDocument({
          filename: pdfFilename,
          content: pdfContentOrText,
          tenantId
        });
      });

      // 3. Registrar éxito en el Circuit Breaker
      cbState.recordSuccess();
      await this.circuitBreakerRepo.saveState(cbState);

      // 4. Crear entidad de Curso en estado BORRADOR (Human-in-the-Loop)
      const course = new Course({
        id: `course_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenantId,
        titulo: generatedDraft.titulo || `Curso generado: ${pdfFilename}`,
        descripcion: generatedDraft.descripcion || 'Curso extraído automáticamente mediante IA con revisión pendiente.',
        origen: 'IA_GENERADO',
        estado: Course.STATUS.BORRADOR,
        profesorRevisorId: profesorRevisorId || 'prof_default',
        creadoPor,
        modulos: generatedDraft.modulos || [],
        evaluacion: new Evaluation({
          id: `eval_${Date.now()}`,
          courseId: null,
          preguntas: generatedDraft.preguntas || [],
          puntajeAprobacion: 70,
          maxIntentos: 2
        })
      });

      // Enlazar el courseId en la evaluación
      course.evaluacion.courseId = course.id;

      await this.courseRepository.save(course);

      return {
        status: 'SUCCESS',
        courseId: course.id,
        course,
        message: 'Borrador generado con éxito por la IA. Notificado al profesor para revisión humana previa a publicación.'
      };

    } catch (err) {
      // Si la API de Claude falla, registrar falla en el Circuit Breaker en DynamoDB
      cbState.recordFailure();
      await this.circuitBreakerRepo.saveState(cbState);

      return {
        status: 'ERROR',
        message: `Error al procesar con IA: ${err.message}. El circuito ha registrado el fallo (${cbState.failureCount}/${cbState.failureThreshold}).`,
        circuitState: cbState.state,
        error: err.message
      };
    }
  }
}

export class CreateManualCourseUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository;
  }

  async execute({ tenantId, titulo, descripcion, modulos = [], preguntas = [], creadoPor }) {
    const courseId = `course_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Curso creado por una persona (profesor o jefatura): no requiere revisión de la IA
    const course = new Course({
      id: courseId,
      tenantId,
      titulo,
      descripcion,
      origen: 'MANUAL',
      estado: Course.STATUS.BORRADOR,
      creadoPor,
      modulos: modulos.map((m, idx) => ({
        id: `m${idx + 1}`,
        orden: idx + 1,
        titulo: m.titulo,
        contenido: m.contenido,
        tiempoEstimado: m.tiempoEstimado || '10 min'
      })),
      evaluacion: new Evaluation({
        id: `eval_${Date.now()}`,
        courseId,
        preguntas: preguntas.map((p, idx) => ({
          id: `q${idx + 1}`,
          enunciado: p.enunciado,
          opciones: p.opciones,
          respuestaCorrecta: Number(p.respuestaCorrecta)
        })),
        puntajeAprobacion: 70,
        maxIntentos: 2
      })
    });

    // Valida que tenga módulos y preguntas antes de publicarlo
    course.aprobarYPublicar(creadoPor);
    await this.courseRepository.save(course);

    return {
      status: 'PUBLICADO',
      courseId: course.id,
      course,
      message: 'Curso manual creado y publicado. Ya está disponible para los colaboradores.'
    };
  }
}

export class ReviewDraftCourseUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository;
  }

  async execute({ tenantId, courseId, profesorId, modulosModificados, preguntasModificadas, accion }) {
    const course = await this.courseRepository.getById(tenantId, courseId);
    if (!course) {
      throw new Error('Curso no encontrado');
    }

    if (course.estado !== Course.STATUS.BORRADOR) {
      throw new Error('Solo los cursos en borrador pueden ser aprobados o editados por el profesor');
    }

    // El profesor puede ajustar o pulir el contenido antes de aprobar
    if (modulosModificados) {
      course.modulos = modulosModificados;
    }
    if (preguntasModificadas && course.evaluacion) {
      course.evaluacion.preguntas = preguntasModificadas;
    }

    if (accion === 'APROBAR') {
      course.aprobarYPublicar(profesorId);
      await this.courseRepository.save(course);
      return {
        status: 'PUBLICADO',
        course,
        message: 'El curso ha sido aprobado por el profesor y ya está publicado para todos los colaboradores.'
      };
    } else {
      // Guardar cambios sin publicar todavía
      await this.courseRepository.save(course);
      return {
        status: 'BORRADOR_ACTUALIZADO',
        course,
        message: 'Cambios guardados en el borrador con éxito.'
      };
    }
  }
}
