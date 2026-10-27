import React, { useState } from 'react';
import { API_BASE } from '../config';

const emptyModulo = () => ({ titulo: '', contenido: '' });
const emptyPregunta = () => ({ enunciado: '', opciones: ['', '', '', ''], respuestaCorrecta: 0 });

// Formulario compartido por Profesor y Jefatura para crear y publicar un curso manual
export function ManualCourseForm({ currentTenant, currentUser }) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [modulos, setModulos] = useState([emptyModulo()]);
  const [preguntas, setPreguntas] = useState([emptyPregunta()]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const updateModulo = (idx, field, value) => {
    const updated = [...modulos];
    updated[idx] = { ...updated[idx], [field]: value };
    setModulos(updated);
  };

  const updatePregunta = (idx, field, value) => {
    const updated = [...preguntas];
    updated[idx] = { ...updated[idx], [field]: value };
    setPreguntas(updated);
  };

  const updateOpcion = (pIdx, oIdx, value) => {
    const updated = [...preguntas];
    const opciones = [...updated[pIdx].opciones];
    opciones[oIdx] = value;
    updated[pIdx] = { ...updated[pIdx], opciones };
    setPreguntas(updated);
  };

  const resetForm = () => {
    setTitulo('');
    setDescripcion('');
    setModulos([emptyModulo()]);
    setPreguntas([emptyPregunta()]);
  };

  const handleSubmit = async () => {
    setResult(null);

    const modulosCompletos = modulos.filter(m => m.titulo.trim() && m.contenido.trim());
    const preguntasCompletas = preguntas.filter(p => p.enunciado.trim() && p.opciones.every(o => o.trim()));

    if (!titulo.trim() || modulosCompletos.length === 0 || preguntasCompletas.length === 0) {
      setResult({ ok: false, message: 'Completa el título, al menos 1 módulo y al menos 1 pregunta con sus 4 opciones.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          titulo,
          descripcion,
          modulos: modulosCompletos,
          preguntas: preguntasCompletas,
          creadoPor: currentUser.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error || 'Error al crear el curso' });
        return;
      }

      setResult({ ok: true, message: data.message });
      resetForm();
    } catch (err) {
      setResult({ ok: false, message: 'Error al conectar con el servidor: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const boxStyle = { background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--surface-border)', marginBottom: '1rem' };

  return (
    <div className="glass-card">
      <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.25rem' }}>
        ✍️ Creación Directa de Curso
      </h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        El curso creado por una persona se publica de inmediato para los colaboradores (no pasa por la bandeja de revisión de la IA).
      </p>

      <div className="form-group">
        <label className="form-label">Título del Curso</label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="form-input"
          placeholder="Ej: Inducción en Movilización Segura de Residentes"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea
          rows={2}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="form-textarea"
          placeholder="Objetivos del curso y público objetivo..."
        />
      </div>

      {/* Módulos */}
      <h4 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '1.5rem 0 1rem' }}>📖 Módulos ({modulos.length})</h4>
      {modulos.map((mod, idx) => (
        <div key={idx} style={boxStyle}>
          <div className="form-group">
            <label className="form-label">Título del Módulo {idx + 1}</label>
            <input
              type="text"
              value={mod.titulo}
              onChange={(e) => updateModulo(idx, 'titulo', e.target.value)}
              className="form-input"
              placeholder="Módulo 1: Procedimientos Básicos"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contenido del Módulo</label>
            <textarea
              rows={3}
              value={mod.contenido}
              onChange={(e) => updateModulo(idx, 'contenido', e.target.value)}
              className="form-textarea"
              placeholder="Detalle de los pasos a seguir..."
            />
          </div>
          {modulos.length > 1 && (
            <button onClick={() => setModulos(modulos.filter((_, i) => i !== idx))} className="btn btn-secondary" style={{ marginTop: '0.75rem', fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
              🗑️ Quitar módulo
            </button>
          )}
        </div>
      ))}
      <button onClick={() => setModulos([...modulos, emptyModulo()])} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
        ➕ Agregar módulo
      </button>

      {/* Preguntas */}
      <h4 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '1.5rem 0 1rem' }}>📝 Preguntas de Evaluación ({preguntas.length})</h4>
      {preguntas.map((q, pIdx) => (
        <div key={pIdx} style={boxStyle}>
          <div className="form-group">
            <label className="form-label">Enunciado Pregunta {pIdx + 1}</label>
            <input
              type="text"
              value={q.enunciado}
              onChange={(e) => updatePregunta(pIdx, 'enunciado', e.target.value)}
              className="form-input"
              placeholder="Ej: ¿Qué se debe hacer si un residente sufre una caída?"
            />
          </div>
          <label className="form-label">Opciones (marca la respuesta correcta)</label>
          {q.opciones.map((opt, oIdx) => (
            <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <input
                type="radio"
                name={`correcta_${pIdx}`}
                checked={q.respuestaCorrecta === oIdx}
                onChange={() => updatePregunta(pIdx, 'respuestaCorrecta', oIdx)}
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOpcion(pIdx, oIdx, e.target.value)}
                className="form-input"
                placeholder={`Opción ${oIdx + 1}`}
              />
            </div>
          ))}
          {preguntas.length > 1 && (
            <button onClick={() => setPreguntas(preguntas.filter((_, i) => i !== pIdx))} className="btn btn-secondary" style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
              🗑️ Quitar pregunta
            </button>
          )}
        </div>
      ))}
      <button onClick={() => setPreguntas([...preguntas, emptyPregunta()])} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
        ➕ Agregar pregunta
      </button>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button disabled={saving} onClick={handleSubmit} className="btn btn-primary">
          {saving ? 'Guardando...' : '💾 Guardar y Publicar Curso'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: '8px', background: result.ok ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: result.ok ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p style={{ fontSize: '0.85rem', color: result.ok ? '#34d399' : '#f87171', fontWeight: 600 }}>
            {result.ok ? '✅ ' : '❌ '}{result.message}
          </p>
        </div>
      )}
    </div>
  );
}
