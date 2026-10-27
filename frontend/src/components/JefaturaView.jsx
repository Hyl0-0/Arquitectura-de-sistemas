import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { ManualCourseForm } from './ManualCourseForm';
import { ComplianceReport } from './ComplianceReport';

export function JefaturaView({ currentTenant, currentUser }) {
  const [circuitBreaker, setCircuitBreaker] = useState(null);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai', 'manual' o 'reportes'
  const [reportData, setReportData] = useState(null);
  const [pdfFilename, setPdfFilename] = useState('Protocolo_Operacional_Alumco_2026.pdf');
  const [pdfContent, setPdfContent] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiMessage, setAiMessage] = useState(null);

  const fetchCircuitBreakerState = async () => {
    try {
      const res = await fetch(`${API_BASE}/resilience/circuit-breaker`);
      if (res.ok) {
        const data = await res.json();
        setCircuitBreaker(data.circuitBreaker);
      }
    } catch (err) {
      console.error('Error al consultar circuit breaker:', err);
    }
  };

  const fetchReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/advance?tenantId=${currentTenant.id}`);
      if (res.ok) {
        setReportData(await res.json());
      }
    } catch (err) {
      console.error('Error al cargar reportes:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'reportes') fetchReport();
  }, [activeTab, currentTenant.id]);

  useEffect(() => {
    fetchCircuitBreakerState();
    const interval = setInterval(fetchCircuitBreakerState, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateAiCourse = async () => {
    setLoadingAi(true);
    setAiMessage(null);
    try {
      const res = await fetch(`${API_BASE}/courses/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          filename: pdfFilename,
          content: pdfContent,
          creadoPor: currentUser.id,
          profesorRevisorId: 'usr_profesor'
        })
      });

      const data = await res.json();
      setAiMessage(data);
      await fetchCircuitBreakerState();
    } catch (err) {
      setAiMessage({ status: 'ERROR', message: err.message });
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <span>📋</span> Gestión de Cursos e Inducciones (Jefatura)
          </h2>
          <p className="section-subtitle">
            Creación de cursos asistida por IA (Workflow secuencial + Circuit Breaker) o manual, y seguimiento del cumplimiento por sede.
          </p>
        </div>

        {/* Estado Circuit Breaker */}
        {circuitBreaker && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(0,0,0,0.25)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--surface-border)' }}>
            <span className={`status-dot ${circuitBreaker.state.toLowerCase()}`} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
              Circuit Breaker IA: {circuitBreaker.state}
            </span>
            {circuitBreaker.state === 'OPEN' && (
              <span className="badge badge-draft" style={{ fontSize: '0.65rem' }}>Bloqueo Activo</span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('ai')}
          className={`btn ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
        >
          🤖 Generar con IA desde Documento PDF
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`btn ${activeTab === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
        >
          ✍️ Crear Curso Manual
        </button>
        <button
          onClick={() => setActiveTab('reportes')}
          className={`btn ${activeTab === 'reportes' ? 'btn-primary' : 'btn-secondary'}`}
        >
          📊 Reportes y Alertas
        </button>
      </div>

      {/* TAB 1: Generación asistida con IA */}
      {activeTab === 'ai' && (
        <div className="glass-card">
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📄</span> Workflow de Extracción Asistida (Claude API + Human-in-the-Loop)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              El archivo ingresa mediante una URL prefirmada de Amazon S3 y la orden se encola en Amazon SQS con aislamiento de recursos (Bulkhead).
            </p>
          </div>

          {circuitBreaker && circuitBreaker.state === 'OPEN' && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <p style={{ color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600 }}>
                ⚠️ Advertencia de Circuit Breaker: La API de IA ha alcanzado 5 fallas consecutivas y el circuito está ABIERTO temporalmente.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                Conforme al diseño de Alumco, para no detener la operación se recomienda utilizar la pestaña de <strong>Crear Curso Manual</strong> mientras el circuito entra en período de enfriamiento.
              </p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nombre del Documento / Protocolo</label>
            <input
              type="text"
              value={pdfFilename}
              onChange={(e) => setPdfFilename(e.target.value)}
              className="form-input"
              placeholder="Ej: Protocolo_Prevencion_Caidas_2026.pdf"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contenido Clave del Protocolo o Notas para la IA</label>
            <textarea
              rows={4}
              value={pdfContent}
              onChange={(e) => setPdfContent(e.target.value)}
              className="form-textarea"
              placeholder="Pegue aquí el texto del protocolo normativo o instrucciones (ej: prevención de caídas, administración de medicamentos, buen trato, plan de emergencias)... Escribe 'FORCE_FAIL' si deseas simular una falla de la API para probar el Circuit Breaker."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              💡 Al generar, el curso quedará en estado <strong>Borrador</strong> para que el Docente lo revise antes de publicarlo.
            </span>
            <button
              disabled={loadingAi}
              onClick={handleGenerateAiCourse}
              className="btn btn-primary"
            >
              {loadingAi ? '⚡ Procesando con IA (Bulkhead Queue)...' : '🚀 Iniciar Extracción con IA'}
            </button>
          </div>

          {/* Feedback de la IA */}
          {aiMessage && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: aiMessage.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: aiMessage.status === 'SUCCESS' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: aiMessage.status === 'SUCCESS' ? '#34d399' : '#f87171' }}>
                {aiMessage.status === 'SUCCESS' ? '✅ Borrador Creado Exitosamente' : '❌ Incidencia Registrada'}
              </h4>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#e2e8f0' }}>
                {aiMessage.message}
              </p>
              {aiMessage.circuitState && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Estado actual del Circuit Breaker: <strong>{aiMessage.circuitState}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Creación manual directa */}
      {activeTab === 'manual' && (
        <ManualCourseForm currentTenant={currentTenant} currentUser={currentUser} />
      )}

      {/* TAB 3: Reportes de cumplimiento y alertas (solo lectura) */}
      {activeTab === 'reportes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button onClick={fetchReport} className="btn btn-secondary" style={{ fontSize: '0.78rem' }}>
              🔄 Actualizar Reportes
            </button>
          </div>
          <ComplianceReport currentTenant={currentTenant} reportData={reportData} />
        </div>
      )}
    </div>
  );
}
