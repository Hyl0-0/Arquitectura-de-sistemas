// Domain Entity: Evaluation
export class Evaluation {
  constructor({
    id,
    courseId,
    preguntas = [],
    puntajeAprobacion = 70, // 70% estipulado en Alumco
    maxIntentos = 2 // Máximo 2 intentos estipulado en Alumco
  }) {
    this.id = id;
    this.courseId = courseId;
    this.preguntas = preguntas;
    this.puntajeAprobacion = puntajeAprobacion;
    this.maxIntentos = maxIntentos;
  }

  calificar(respuestasUsuario = {}) {
    if (!this.preguntas || this.preguntas.length === 0) return { puntaje: 0, aprobado: false };
    
    let correctas = 0;
    this.preguntas.forEach((pregunta, idx) => {
      const resp = respuestasUsuario[pregunta.id || idx];
      if (resp !== undefined && resp === pregunta.respuestaCorrecta) {
        correctas++;
      }
    });

    const porcentaje = Math.round((correctas / this.preguntas.length) * 100);
    const aprobado = porcentaje >= this.puntajeAprobacion;

    return {
      totalPreguntas: this.preguntas.length,
      correctas,
      porcentaje,
      aprobado
    };
  }
}
