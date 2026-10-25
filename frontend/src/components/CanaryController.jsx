import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export function CanaryController({ currentTenantId }) {
  const [canaryData, setCanaryData] = useState(null);
  const [weight, setWeight] = useState(10);
  const [simulatedRoute, setSimulatedRoute] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchCanaryStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/canary/status`);
      if (res.ok) {
        const data = await res.json();
        setCanaryData(data);
        setWeight(data.weight);
      }
    } catch (err) {
      console.error('Error al obtener estado canario:', err);
    }
  };

  const handleUpdateWeight = async (newWeight) => {
    setWeight(newWeight);
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/canary/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: newWeight })
      });
      if (res.ok) {
        const updated = await res.json();
        setCanaryData(updated);
      }
    } catch (err) {
      console.error('Error al actualizar peso canario:', err);
    } finally {
      setSaving(false);
    }
  };

  const simulateRouting = async () => {
    try {
      const res = await fetch(`${API_BASE}/canary/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'usr_demo', tenantId: currentTenantId })
      });
      if (res.ok) {
        const route = await res.json();
        setSimulatedRoute(route);
      }
    } catch (err) {
      console.error('Error al simular enrutamiento:', err);
    }
  };

  useEffect(() => {
    fetchCanaryStatus();
  }, []);

  if (!canaryData) return null;

  return (
    <div className="canary-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '1.25rem' }}>🐤</span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Despliegue Canario Activo (AWS SAM / API Gateway)</span>
            <span className="badge badge-canary">
              {canaryData.weight}% Tráfico Canario
            </span>
            <span className="badge badge-cloudwatch">
              CloudWatch: {canaryData.canaryHealth}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Estable: <strong>{canaryData.stableVersion}</strong> (90%) | Canario: <strong>{canaryData.activeVersion}</strong> (10%)
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Rollout:</label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={weight}
            onChange={(e) => handleUpdateWeight(Number(e.target.value))}
            className="canary-slider"
          />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, width: '38px' }}>{weight}%</span>
        </div>

        <button onClick={simulateRouting} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
          🎲 Probar Enrutamiento
        </button>

        {simulatedRoute && (
          <div style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: '4px', background: simulatedRoute.version === 'canary' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)', color: simulatedRoute.version === 'canary' ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
            {simulatedRoute.version === 'canary' ? '🐤 Enrutado a Canary v1.1' : '🛡️ Enrutado a Estable v1.0'}
          </div>
        )}
      </div>
    </div>
  );
}
