import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export function ColaboradorView({ currentTenant, currentUser }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [inEvaluation, setInEvaluation] = useState(false);
  const [answers, setAnswers] = useState({});
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_BASE}/courses?tenantId=${currentTenant.id}&estado=PUBLICADO`);
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (err) {
      console.error('Error al cargar cursos:', err);
    }
  };

  const fetchCertificates = async () => {
    try {
      const res = await fetch(`${API_BASE}/certificates?tenantId=${currentTenant.id}&userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setCertificates(data);
      }
    } catch (err) {
      console.error('Error al cargar certificados:', err);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchCertificates();
  }, [currentTenant.id, currentUser.id]);

  const handleSelectOption = (questionId, optionIdx) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIdx
    }));
  };

  const handleSubmitEvaluation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/evaluations/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          userId: currentUser.id,
          courseId: selectedCourse.id,
          respuestas: answers
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al enviar evaluación');
        return;
      }

      setEvaluationResult(data);
      if (data.aprobado) {
        await fetchCertificates();
      }
    } catch (err) {
      alert('Error de conexión al enviar evaluación: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetEvaluation = () => {
    setEvaluationResult(null);
    setAnswers({});
    setInEvaluation(false);
  };

  return (
    <div>
      {/* Certificados obtenidos */}
      {certificates.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏆 Mis Certificados Obtenidos ({certificates.length})
          </h3>
          <div className="grid-3">
            {certificates.map(cert => (
              <div key={cert.id} className="glass-card" style={{ borderColor: 'rgba(251, 191, 36, 0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.75rem' }}>📜</span>
                  <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
                    Aprobado {cert.puntaje}%
                  </span>
                </div>
                <h4 style={{ margin: '0.75rem 0 0.35rem 0', fontSize: '0.95rem' }}>{cert.courseTitle}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Código Verificación: <strong style={{ color: '#fbbf24' }}>{cert.codigoVerificacion}</strong>
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                  Fecha: {new Date(cert.fechaEmision).toLocaleDateString()}
                </p>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    onClick={() => alert(`Descargando certificado digital oficial emitido por ${currentTenant.name} desde Amazon S3: ${cert.codigoVerificacion}`)}
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.78rem', padding: '0.4rem' }}
                  >
                    📥 Descargar PDF Oficial
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Si está en modo rendición o lectura de curso */}
      {selectedCourse ? (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
            <div>
              <button onClick={() => { setSelectedCourse(null); resetEvaluation(); }} className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                ← Volver a Cursos
              </button>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{selectedCourse.titulo}</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedCourse.descripcion}</p>
            </div>
            <div>
              {!inEvaluation && selectedCourse.evaluacion && (
                <button
                  onClick={() => { setInEvaluation(true); setAnswers({}); setEvaluationResult(null); }}
                  className="btn btn-primary"
                >
                  📝 Rendir Evaluación Final
                </button>
              )}
            </div>
          </div>

          {/* VISTA 1: Módulos de Aprendizaje */}
          {!inEvaluation && selectedCourse.modulos && selectedCourse.modulos.length > 0 && (
            <div>
              {/* Pestañas de módulos */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {selectedCourse.modulos.map((mod, idx) => (
                  <button
                    key={mod.id || idx}
                    onClick={() => setActiveModuleIdx(idx)}
                    className={`btn ${activeModuleIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
                  >
                    {mod.titulo || `Módulo ${idx + 1}`}
                  </button>
                ))}
              </div>

              {/* Contenido del módulo activo */}
              {selectedCourse.modulos[activeModuleIdx] && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--surface-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedCourse.modulos[activeModuleIdx].titulo}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ⏱️ {selectedCourse.modulos[activeModuleIdx].tiempoEstimado || '15 min'}
                    </span>
                  </div>
                  <p style={{ lineHeight: '1.7', color: '#e2e8f0', whiteSpace: 'pre-line', fontSize: '0.95rem' }}>
                    {selectedCourse.modulos[activeModuleIdx].contenido}
                  </p>

                  <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                    <button
                      disabled={activeModuleIdx === 0}
                      onClick={() => setActiveModuleIdx(i => i - 1)}
                      className="btn btn-secondary"
                    >
                      ← Módulo Anterior
                    </button>
                    {activeModuleIdx < selectedCourse.modulos.length - 1 ? (
                      <button
                        onClick={() => setActiveModuleIdx(i => i + 1)}
                        className="btn btn-secondary"
                      >
                        Siguiente Módulo →
                      </button>
                    ) : (
                      <button
                        onClick={() => { setInEvaluation(true); setAnswers({}); setEvaluationResult(null); }}
                        className="btn btn-primary"
                      >
                        Finalizar Lectura e Ir a Evaluación →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VISTA 2: Evaluación Interactiva (Control de Intentos y Reglas de Negocio) */}
          {inEvaluation && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
                  Evaluación de Certificación (Corte: 70% | Máximo: 2 Intentos)
                </h3>
                <button onClick={() => setInEvaluation(false)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                  Volver a Módulos
                </button>
              </div>

              {/* Resultado de la evaluación */}
              {evaluationResult ? (
                <div style={{ marginTop: '1.5rem' }}>
                  {evaluationResult.aprobado ? (
                    <div className="certificate-card">
                      <div className="cert-border-seal">SELLO OFICIAL</div>
                      <span style={{ fontSize: '3rem' }}>🎉</span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.5rem' }}>
                        ¡FELICITACIONES, APROBADO!
                      </h2>
                      <p style={{ fontSize: '1.1rem', marginTop: '0.5rem' }}>
                        Has alcanzado un puntaje de <strong>{evaluationResult.puntaje}%</strong> (Umbral exigido: 70%)
                      </p>
                      <div style={{ margin: '1.5rem 0', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                        <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Certificado emitido para:</p>
                        <h3 style={{ fontSize: '1.3rem', color: '#fff', margin: '0.25rem 0' }}>{currentUser.name}</h3>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          Organización: {currentTenant.name} | Sede: {currentUser.sede}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: '#fbbf24', marginTop: '0.75rem', fontWeight: 600 }}>
                          Código Digital Único: {evaluationResult.certificado?.codigoVerificacion}
                        </p>
                      </div>
                      <button
                        onClick={() => { setSelectedCourse(null); resetEvaluation(); }}
                        className="btn btn-primary"
                        style={{ padding: '0.7rem 1.8rem' }}
                      >
                        Finalizar y Volver a Mi Panel
                      </button>
                    </div>
                  ) : (
                    <div className="glass-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)', textAlign: 'center', padding: '2rem' }}>
                      <span style={{ fontSize: '2.5rem' }}>⚠️</span>
                      <h3 style={{ fontSize: '1.3rem', color: '#f87171', margin: '0.5rem 0' }}>
                        Evaluación No Aprobada ({evaluationResult.puntaje}%)
                      </h3>
                      <p style={{ fontSize: '0.9rem', color: '#fca5a5', maxWidth: '600px', margin: '0 auto' }}>
                        {evaluationResult.mensaje}
                      </p>

                      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        {evaluationResult.intentosRestantes > 0 ? (
                          <button
                            onClick={() => { setAnswers({}); setEvaluationResult(null); }}
                            className="btn btn-primary"
                          >
                            🔄 Reintentar Evaluación ({evaluationResult.intentosRestantes} intento restante)
                          </button>
                        ) : (
                          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)' }}>
                            <p style={{ fontSize: '0.82rem', color: '#fca5a5' }}>
                              ❌ Se han agotado los 2 intentos permitidos. Conforme al protocolo del informe, se ha notificado automáticamente vía <strong>Amazon SES</strong> a la administración para el plan de escalamiento.
                            </p>
                          </div>
                        )}
                        <button onClick={() => { setSelectedCourse(null); resetEvaluation(); }} className="btn btn-secondary">
                          Cerrar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Formulario de preguntas */
                <div>
                  {selectedCourse.evaluacion.preguntas && selectedCourse.evaluacion.preguntas.map((q, qIdx) => {
                    const qKey = q.id || String(qIdx);
                    return (
                      <div key={qKey} style={{ marginBottom: '1.75rem', background: 'rgba(0,0,0,0.15)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--surface-border)' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.85rem' }}>
                          <span style={{ color: 'var(--primary)', marginRight: '0.5rem' }}>{qIdx + 1}.</span>
                          {q.enunciado}
                        </p>
                        <div>
                          {q.opciones.map((opt, optIdx) => {
                            const isSelected = answers[qKey] === optIdx;
                            return (
                              <div
                                key={optIdx}
                                onClick={() => handleSelectOption(qKey, optIdx)}
                                className={`option-item ${isSelected ? 'selected' : ''}`}
                              >
                                <div style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  border: isSelected ? '5px solid var(--primary)' : '2px solid rgba(255,255,255,0.3)',
                                  background: '#090d16'
                                }} />
                                <span style={{ fontSize: '0.88rem' }}>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button onClick={() => setInEvaluation(false)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button
                      disabled={loading || Object.keys(answers).length < (selectedCourse.evaluacion.preguntas?.length || 0)}
                      onClick={handleSubmitEvaluation}
                      className="btn btn-success"
                      style={{ padding: '0.65rem 1.6rem' }}
                    >
                      {loading ? 'Corrigiendo evaluación...' : '📤 Enviar Respuestas para Calificación'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Lista de cursos disponibles */
        <div>
          <div className="section-header">
            <div>
              <h2 className="section-title">
                <span>📚</span> Cursos y Capacitaciones Disponibles
              </h2>
              <p className="section-subtitle">
                Plataforma de {currentTenant.name} | Sede asignada: <strong>{currentUser.sede}</strong>
              </p>
            </div>
            <button onClick={fetchCourses} className="btn btn-secondary" style={{ fontSize: '0.78rem' }}>
              🔄 Actualizar Cursos
            </button>
          </div>

          <div className="grid-3">
            {courses.map(course => (
              <div key={course.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="badge badge-published">✓ Publicado</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {course.modulos?.length || 0} módulos
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: '1.3' }}>
                    {course.titulo}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                    {course.descripcion}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', borderTop: '1px solid var(--surface-border)', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                    <span>Corte de Aprobación: 70%</span>
                    <span>Máx 2 intentos</span>
                  </div>
                  <button
                    onClick={() => { setSelectedCourse(course); setActiveModuleIdx(0); setInEvaluation(false); setEvaluationResult(null); }}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    Iniciar Inducción →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
