import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { ManualCourseForm } from './ManualCourseForm';

export function ProfesorView({ currentTenant, currentUser }) {
  const [activeTab, setActiveTab] = useState('bandeja'); // 'bandeja' o 'manual'
  const [draftCourses, setDraftCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingModulos, setEditingModulos] = useState([]);
  const [editingPreguntas, setEditingPreguntas] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchDraftCourses = async () => {
    try {
      const res = await fetch(`${API_BASE}/courses?tenantId=${currentTenant.id}&estado=BORRADOR`);
      if (res.ok) {
        const data = await res.json();
        setDraftCourses(data);
      }
    } catch (err) {
      console.error('Error al cargar borradores:', err);
    }
  };

  useEffect(() => {
    fetchDraftCourses();
  }, [currentTenant.id]);

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setEditingModulos(JSON.parse(JSON.stringify(course.modulos || [])));
    setEditingPreguntas(JSON.parse(JSON.stringify(course.evaluacion?.preguntas || [])));
  };

  const handleUpdateModuloText = (idx, field, value) => {
    const updated = [...editingModulos];
    updated[idx][field] = value;
    setEditingModulos(updated);
  };

  const handleUpdatePreguntaText = (idx, value) => {
    const updated = [...editingPreguntas];
    updated[idx].enunciado = value;
    setEditingPreguntas(updated);
  };

  const handleSaveOrApprove = async (accion) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/courses/review-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          courseId: selectedCourse.id,
          profesorId: currentUser.id,
          modulos: editingModulos,
          preguntas: editingPreguntas,
          accion // 'APROBAR' o 'GUARDAR'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al procesar la revisión');
        return;
      }

      alert(data.message);
      setSelectedCourse(null);
      await fetchDraftCourses();
    } catch (err) {
      alert('Error al conectar con el servidor: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <span>👨‍🏫</span> Bandeja Docente: Human-in-the-Loop
          </h2>
          <p className="section-subtitle">
            Revisión pedagógica de borradores generados por IA (HITL) y creación manual de cursos • Docente en sesión: <strong style={{ color: 'var(--text-main)' }}>{currentUser.name}</strong> ({currentUser.cargo})
          </p>
        </div>
        {activeTab === 'bandeja' && (
          <button onClick={fetchDraftCourses} className="btn btn-secondary" style={{ fontSize: '0.78rem' }}>
            🔄 Actualizar Borradores
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('bandeja')}
          className={`btn ${activeTab === 'bandeja' ? 'btn-primary' : 'btn-secondary'}`}
        >
          ✏️ Revisar Borradores IA
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`btn ${activeTab === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
        >
          ✍️ Crear Curso Manual
        </button>
      </div>

      {activeTab === 'manual' ? (
        <ManualCourseForm currentTenant={currentTenant} currentUser={currentUser} />
      ) : selectedCourse ? (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
            <div>
              <button onClick={() => setSelectedCourse(null)} className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                ← Volver a Bandeja
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedCourse.titulo}</h3>
                <span className="badge badge-draft">Borrador IA Pendiente</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Origen: <strong>{selectedCourse.origen}</strong> | Revisor asignado: {currentUser.name}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                disabled={saving}
                onClick={() => handleSaveOrApprove('GUARDAR')}
                className="btn btn-secondary"
              >
                💾 Guardar Cambios
              </button>
              <button
                disabled={saving}
                onClick={() => handleSaveOrApprove('APROBAR')}
                className="btn btn-success"
              >
                ✅ Aprobar y Publicar Curso
              </button>
            </div>
          </div>

          {/* Edición de Módulos */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>
              📖 Módulos de Aprendizaje Generados ({editingModulos.length})
            </h4>
            {editingModulos.map((mod, idx) => (
              <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--surface-border)', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Título del Módulo {idx + 1}</label>
                  <input
                    type="text"
                    value={mod.titulo}
                    onChange={(e) => handleUpdateModuloText(idx, 'titulo', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Contenido Pedagógico</label>
                  <textarea
                    rows={4}
                    value={mod.contenido}
                    onChange={(e) => handleUpdateModuloText(idx, 'contenido', e.target.value)}
                    className="form-textarea"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Edición de Preguntas de Evaluación */}
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>
              📝 Preguntas de Evaluación Propuestas por la IA ({editingPreguntas.length})
            </h4>
            {editingPreguntas.map((q, idx) => (
              <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--surface-border)', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Enunciado Pregunta {idx + 1}</label>
                  <input
                    type="text"
                    value={q.enunciado}
                    onChange={(e) => handleUpdatePreguntaText(idx, e.target.value)}
                    className="form-input"
                  />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Opciones configuradas:</p>
                  {q.opciones.map((opt, oIdx) => (
                    <div key={oIdx} style={{ padding: '0.35rem 0.65rem', marginBottom: '0.25rem', borderRadius: '4px', background: oIdx === q.respuestaCorrecta ? 'rgba(16, 185, 129, 0.15)' : 'transparent', color: oIdx === q.respuestaCorrecta ? '#34d399' : 'inherit', border: oIdx === q.respuestaCorrecta ? '1px solid rgba(16, 185, 129, 0.3)' : 'none' }}>
                      {oIdx === q.respuestaCorrecta ? '✓ (Respuesta Correcta): ' : '• '} {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Lista de borradores pendientes */
        <div>
          {draftCourses.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <span style={{ fontSize: '2.5rem' }}>✨</span>
              <h3 style={{ marginTop: '0.75rem', fontSize: '1.15rem' }}>No hay cursos pendientes de revisión</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Cuando la jefatura suba un nuevo documento PDF para procesamiento con IA, aparecerá aquí para su validación docente.
              </p>
            </div>
          ) : (
            <div className="grid-2">
              {draftCourses.map(course => (
                <div key={course.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className="badge badge-draft">⏳ Borrador IA Pendiente</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {new Date(course.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {course.titulo}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1rem' }}>
                      {course.descripcion}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {course.modulos?.length || 0} módulos | {course.evaluacion?.preguntas?.length || 0} preguntas
                    </span>
                    <button
                      onClick={() => handleSelectCourse(course)}
                      className="btn btn-primary"
                      style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                    >
                      ✏️ Revisar y Aprobar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
