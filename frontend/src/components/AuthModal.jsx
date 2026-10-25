import React, { useState } from 'react';
import { API_BASE } from '../config';

export function AuthModal({ isOpen, onClose, users, currentTenant, onSelectUser, onUserCreated }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('COLABORADOR');
  const [sede, setSede] = useState(currentTenant?.sedes?.[0] || 'Sede Central (Santiago)');
  const [cargo, setCargo] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email) {
      alert('Por favor ingresa nombre y correo electrónico');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          name,
          email,
          role,
          sede,
          cargo: cargo || (role === 'COLABORADOR' ? 'Colaborador en Inducción' : 'Docente Revisor')
        })
      });

      if (!res.ok) {
        throw new Error('No se pudo registrar el usuario');
      }

      const newUser = await res.json();
      onUserCreated(newUser);
      onSelectUser(newUser.id, newUser.role);
      alert(`¡Usuario ${newUser.name} registrado con éxito en DynamoDB!`);
      onClose();
    } catch (err) {
      alert('Error en registro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="glass-card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Autenticación y Registro Multi-Rol</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Organización actual: <strong>{currentTenant.name}</strong>
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.85rem' }}>
            ✕
          </button>
        </div>

        {/* Selector de Pestaña */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            onClick={() => setTab('login')}
            className={`btn ${tab === 'login' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, fontSize: '0.82rem' }}
          >
            👥 Cambiar de Cuenta / Iniciar Sesión
          </button>
          <button
            onClick={() => setTab('register')}
            className={`btn ${tab === 'register' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, fontSize: '0.82rem' }}
          >
            ➕ Registrar Nuevo Colaborador / Docente
          </button>
        </div>

        {tab === 'login' ? (
          <div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              Selecciona cualquier usuario para simular su sesión y ver sus cursos, evaluaciones o permisos:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '380px', overflowY: 'auto' }}>
              {users.map(u => (
                <div
                  key={u.id}
                  onClick={() => {
                    onSelectUser(u.id, u.role);
                    onClose();
                  }}
                  className="option-item"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>
                      {u.role === 'COLABORADOR' ? '👷' : u.role === 'PROFESOR' ? '👨‍🏫' : u.role === 'JEFATURA' ? '📋' : '⚙️'}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {u.cargo} • {u.sede}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${u.role === 'COLABORADOR' ? 'badge-role' : u.role === 'PROFESOR' ? 'badge-published' : 'badge-draft'}`}>
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                placeholder="Ej: Matías Rojas"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Correo Electrónico Corporativo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="mrojas@alumco.cl"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Rol en el Sistema</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="form-input"
                >
                  <option value="COLABORADOR">👷 Colaborador (Alumno / Capacitación)</option>
                  <option value="PROFESOR">👨‍🏫 Profesor (Revisor Human-in-the-Loop)</option>
                  <option value="JEFATURA">📋 Jefatura de Capacitación</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sede Asignada</label>
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  className="form-input"
                >
                  {(currentTenant.sedes || []).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cargo o Especialidad</label>
              <input
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="form-input"
                placeholder="Ej: Técnico en Metalurgia / Prevencionista"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Registrando en DynamoDB...' : '✅ Registrar e Iniciar Sesión'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
