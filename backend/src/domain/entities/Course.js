// Domain Entity: Course (Curso)
export class Course {
  static STATUS = {
    BORRADOR: 'BORRADOR', // Generado por IA o iniciado manualmente, requiere revisión humana
    PUBLICADO: 'PUBLICADO', // Aprobado por el profesor y disponible para colaboradores
    ARCHIVADO: 'ARCHIVADO'
  };

  constructor({
    id,
    tenantId,
    titulo,
    descripcion,
    origen = 'MANUAL', // 'MANUAL' | 'IA_GENERADO'
    estado = Course.STATUS.BORRADOR,
    profesorRevisorId = null,
    creadoPor = null,
    modulos = [],
    evaluacion = null,
    createdAt = new Date().toISOString(),
    aprobadoAt = null,
    version = '1.0.0'
  }) {
    if (!id || !tenantId || !titulo) {
      throw new Error('Course requires id, tenantId, and titulo');
    }
    this.id = id;
    this.tenantId = tenantId;
    this.titulo = titulo;
    this.descripcion = descripcion || '';
    this.origen = origen;
    this.estado = estado;
    this.profesorRevisorId = profesorRevisorId;
    this.creadoPor = creadoPor;
    this.modulos = modulos;
    this.evaluacion = evaluacion;
    this.createdAt = createdAt;
    this.aprobadoAt = aprobadoAt;
    this.version = version;
  }

  estaListoParaPublicar() {
    return (
      this.modulos &&
      this.modulos.length > 0 &&
      this.evaluacion &&
      this.evaluacion.preguntas &&
      this.evaluacion.preguntas.length > 0
    );
  }

  aprobarYPublicar(profesorId) {
    if (!this.estaListoParaPublicar()) {
      throw new Error('El curso no tiene módulos o evaluación configurada para ser publicado');
    }
    this.estado = Course.STATUS.PUBLICADO;
    this.profesorRevisorId = profesorId;
    this.aprobadoAt = new Date().toISOString();
  }
}
