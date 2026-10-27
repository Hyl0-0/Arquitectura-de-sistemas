import React from 'react';

// Reporte de cumplimiento por sede y alertas de escalamiento (lo ven Jefatura y Admin)
export function ComplianceReport({ currentTenant, reportData }) {
  return (
    <div>
      {/* Reporte de cumplimiento por sede */}
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

      {reportData && (!reportData.recentNotifications || reportData.recentNotifications.length === 0) && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          📬 Sin alertas de escalamiento: ningún colaborador ha reprobado sus 2 intentos.
        </p>
      )}

      {/* Alertas de escalamiento (2º intento reprobado, enviadas por Amazon SES) */}
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
