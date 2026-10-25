import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export function AdminView({ currentTenant, currentUser, onOpenBrandingModal }) {
  const [reportData, setReportData] = useState(null);
  const [resilienceData, setResilienceData] = useState(null);
  const [toggling, setToggling] = useState(false);

  const fetchData = async () => {
    try {
      // 1. Reportes de avance por sede
      const resRep = await fetch(`${API_BASE}/reports/advance?tenantId=${currentTenant.id}`);
      if (resRep.ok) {
        const dataRep = await resRep.json();
        setReportData(dataRep);
      }

      // 2. Telemetría de Circuit Breaker y Bulkhead
      const resRes = await fetch(`${API_BASE}/resilience/circuit-breaker`);
      if (resRes.ok) {
        const dataRes = await resRes.json();
        setResilienceData(dataRes);
      }
    } catch (err) {
      console.error('Error al cargar datos de administración:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [currentTenant.id]);

  const handleCircuitBreakerAction = async (action) => {
    setToggling(true);
    try {
      const res = await fetch(`${API_BASE}/resilience/circuit-breaker/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      alert('Error al modificar Circuit Breaker: ' + err.message);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <span>⚙️</span> Panel de Administración y Monitoreo de Arquitectura
          </h2>
          <p className="section-subtitle">
            Reporte de cumplimiento por sede, telemetría de resiliencia y personalización corporativa.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onOpenBrandingModal} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
            🎨 Personalizar Marca y Colores
          </button>
          <button onClick={fetchData} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: TELEMETRÍA DE RESILIENCIA (CIRCUIT BREAKER, BULKHEAD, RETRY) */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🛡️</span> Telemetría de Patrones de Resiliencia en la Nube
        </h3>

        <div className="grid-3">
          {/* Tarjeta 1: Circuit Breaker */}
          {resilienceData?.circuitBreaker && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Circuit Breaker (DynamoDB)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className={`status-dot ${resilienceData.circuitBreaker.state.toLowerCase()}`} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      {resilienceData.circuitBreaker.state}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Servicio protegido: <strong>{resilienceData.circuitBreaker.serviceName}</strong>
                </p>
                <div style={{ margin: '0.75rem 0', padding: '0.6rem', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fallos Consecutivos:</span>
                    <strong>{resilienceData.circuitBreaker.failureCount} / {resilienceData.circuitBreaker.failureThreshold}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                    <span>Cooldown de Enfriamiento:</span>
                    <strong>{resilienceData.circuitBreaker.cooldownSeconds}s</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  disabled={toggling}
                  onClick={() => handleCircuitBreakerAction('SIMULATE_FAILURE')}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '0.72rem', padding: '0.35rem' }}
                >
                  ⚡ Simular Fallo
                </button>
                <button
                  disabled={toggling}
                  onClick={() => handleCircuitBreakerAction('RESET')}
                  className="btn btn-success"
                  style={{ flex: 1, fontSize: '0.72rem', padding: '0.35rem' }}
                >
                  🔄 Reset (CLOSED)
                </button>
              </div>
            </div>
          )}

          {/* Tarjeta 2: Bulkhead */}
          {resilienceData?.bulkhead && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Patrón Bulkhead (SQS + Lambda)</span>
                <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                  Aislado
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Concurrencia reservada para generación pesada de IA para no degradar la evaluación de colaboradores.
              </p>
              <div style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Concurrencia Máxima:</span>
                  <strong>{resilienceData.bulkhead.maxConcurrency} ejecuciones</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                  <span>En ejecución ahora:</span>
                  <strong>{resilienceData.bulkhead.currentRunning}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                  <span>En cola de espera:</span>
                  <strong>{resilienceData.bulkhead.waitingInQueue}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Tarjeta 3: Retry & Notificaciones SES */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Patrón Retry (Amazon SES)</span>
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                Activo
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Backoff exponencial para entrega de alertas y escalamiento formal ante colaboradores reprobados.
            </p>
            <div style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Reintentos Máximos:</span>
                <strong>3 intentos con backoff</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                <span>Alertas SES Emitidas:</span>
                <strong>{reportData?.recentNotifications?.length || 0} registradas</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: REPORTE DE CUMPLIMIENTO POR SEDE (Valentina Garrido - Alumco) */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📊</span> Estado de Cumplimiento e Inducción por Sede ({currentTenant.name})
        </h3>

        {reportData?.statsBySede && (
          <div className="grid-3">
            {Object.entries(reportData.statsBySede).map(([sede, stats]) => {
              const tasaAprobacion = stats.evaluados > 0 ? Math.round((stats.aprobados / stats.evaluados) * 100) : 0;
              return (
                <div key={sede} className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{sede}</h4>
                    <span className="badge" style={{ background: tasaAprobacion >= 70 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: tasaAprobacion >= 70 ? '#34d399' : '#fbbf24' }}>
                      {tasaAprobacion}% Cumplimiento
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Colaboradores:</span>
                      <strong>{stats.totalColaboradores}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Evaluaciones Rendidas:</span>
                      <strong>{stats.evaluados}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Certificados Emitidos:</span>
                      <strong style={{ color: '#34d399' }}>{stats.aprobados}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Reprobados (2 intentos):</span>
                      <strong style={{ color: '#f87171' }}>{stats.reprobados}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN 3: NOTIFICACIONES DE ESCALAMIENTO RECIENTES (SES) */}
      {reportData?.recentNotifications && reportData.recentNotifications.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📬</span> Notificaciones de Escalamiento Registradas (Amazon SES)
          </h3>
          <div className="glass-card">
            {reportData.recentNotifications.map(n => (
              <div key={n.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{n.subject}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{n.body}</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  <span>{new Date(n.sentAt).toLocaleTimeString()}</span>
                  <div style={{ color: '#34d399' }}>✓ Enviado tras {n.attemptsNeeded} intento(s)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
