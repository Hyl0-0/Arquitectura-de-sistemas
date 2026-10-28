import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CanaryController } from './components/CanaryController';
import { ColaboradorView } from './components/ColaboradorView';
import { ProfesorView } from './components/ProfesorView';
import { JefaturaView } from './components/JefaturaView';
import { AdminView } from './components/AdminView';
import { BrandingEditorModal } from './components/BrandingEditorModal';
import { AuthModal } from './components/AuthModal';
import { API_BASE } from './config';

function AppContent() {
  const {
    tenants,
    currentTenantId,
    setCurrentTenantId,
    currentTenant,
    loading,
    colorMode,
    toggleColorMode
  } = useTheme();

  // Roles del sistema: ADMIN, JEFATURA, PROFESOR, COLABORADOR
  const [activeRole, setActiveRole] = useState('COLABORADOR');
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Cargar usuarios del tenant
  const fetchUsers = async () => {
    if (!currentTenantId) return;
    try {
      const res = await fetch(`${API_BASE}/users?tenantId=${currentTenantId}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (data.length > 0) {
          const matchUser = data.find(u => u.role === activeRole) || data[0];
          setSelectedUserId(matchUser.id);
        }
      }
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const handleSelectUser = (userId, role) => {
    setSelectedUserId(userId);
    if (role) setActiveRole(role);
  };

  const handleUserCreated = (newUser) => {
    setUsers(prev => [newUser, ...prev]);
  };

  useEffect(() => {
    fetchUsers();
  }, [currentTenantId]);

  useEffect(() => {
    const currentUserMatch = users.find(u => u.id === selectedUserId);
    if (!currentUserMatch || currentUserMatch.role !== activeRole) {
      const match = users.find(u => u.role === activeRole);
      if (match) setSelectedUserId(match.id);
    }
  }, [activeRole, users]);

  if (loading || !currentTenant) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#090d16' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p style={{ color: '#94a3b8' }}>Cargando plataforma serverless y motor de Theming...</p>
        </div>
      </div>
    );
  }

  const currentUser = users.find(u => u.id === selectedUserId) || {
    id: 'usr_default',
    name: 'Usuario Activo',
    role: activeRole,
    sede: currentTenant.sedes?.[0] || 'Sede Central'
  };

  return (
    <div>
      {/* 1. BARRA SUPERIOR (TOP-BAR) */}
      <header className="top-bar">
        {/* Lado Izquierdo: Identidad de Marca y Sesión de Usuario (Estable) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div className="brand-section">
            {currentTenant.logoUrl ? (
              <img src={currentTenant.logoUrl} alt={currentTenant.name} className="brand-logo-img" />
            ) : (
              <div className="brand-logo-img" style={{ background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>
                {currentTenant.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="brand-title">
                {currentTenant.name}
                <span className="brand-badge">Multi-Tenant</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {currentTenant.tagline}
              </p>
            </div>
          </div>

          {/* Selector de Usuario Activo en la IZQUIERDA (Evita saltos en la interfaz) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--surface-border)', paddingLeft: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '1.1rem' }}>
                {activeRole === 'COLABORADOR' ? '👷' : activeRole === 'PROFESOR' ? '👨‍🏫' : activeRole === 'JEFATURA' ? '📋' : '⚙️'}
              </span>
              <select
                value={selectedUserId}
                onChange={(e) => {
                  const uid = e.target.value;
                  const match = users.find(u => u.id === uid);
                  if (match) handleSelectUser(uid, match.role);
                }}
                className="select-input"
                style={{ fontSize: '0.78rem', maxWidth: '210px' }}
                title="Usuario en sesión activa"
              >
                <optgroup label="👷 Colaboradores (Alumnos / Inducción)">
                  {users.filter(u => u.role === 'COLABORADOR').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.sede.split(' ')[0]}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="👨‍🏫 Profesores (Revisión Human-in-the-Loop)">
                  {users.filter(u => u.role === 'PROFESOR').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="📋 Jefatura & Administración">
                  {users.filter(u => u.role === 'JEFATURA' || u.role === 'ADMIN').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              title="Iniciar sesión con otra cuenta o registrar nuevo colaborador/docente"
            >
              🔑 Login / Registro
            </button>
          </div>
        </div>

        {/* Lado Derecho: Controles Globales (Organización, Pestañas de Rol, Theming, Modo Claro) */}
        <div className="top-bar-controls">
          {/* Selector de Tenant */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Organización:</label>
            <select
              value={currentTenantId}
              onChange={(e) => setCurrentTenantId(e.target.value)}
              className="select-input"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Navegación por Rol (Certamen 1) */}
          <div className="nav-tabs">
            <button
              onClick={() => setActiveRole('COLABORADOR')}
              className={`nav-tab-btn ${activeRole === 'COLABORADOR' ? 'active' : ''}`}
            >
              👷 Colaborador
            </button>
            <button
              onClick={() => setActiveRole('PROFESOR')}
              className={`nav-tab-btn ${activeRole === 'PROFESOR' ? 'active' : ''}`}
            >
              👨‍🏫 Profesor (HITL)
            </button>
            <button
              onClick={() => setActiveRole('JEFATURA')}
              className={`nav-tab-btn ${activeRole === 'JEFATURA' ? 'active' : ''}`}
            >
              📋 Jefatura
            </button>
            <button
              onClick={() => setActiveRole('ADMIN')}
              className={`nav-tab-btn ${activeRole === 'ADMIN' ? 'active' : ''}`}
            >
              ⚙️ Admin & DevOps
            </button>
          </div>

          {/* Botón rápido de branding (solo Admin TI) */}
          {activeRole === 'ADMIN' && (
            <button
              onClick={() => setIsBrandingModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
              title="Personalizar colores y logo"
            >
              🎨 Theming
            </button>
          )}

          {/* Selector de Modo Claro / Modo Oscuro */}
          <button
            onClick={toggleColorMode}
            className="btn btn-secondary mode-toggle-btn"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title={colorMode === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {colorMode === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
          </button>
        </div>
      </header>

      {/* 2. CONTENEDOR PRINCIPAL */}
      <main className="main-wrapper">
        {/* Banner de Control Canario (AWS SAM / Traffic-Shifting), solo Admin TI */}
        {activeRole === 'ADMIN' && <CanaryController currentTenantId={currentTenantId} />}

        {/* 3. VISTAS SEGÚN EL ROL ACTIVO */}
        {/* key: al cambiar de usuario u organización, la vista se reinicia y no conserva el estado del usuario anterior */}
        {activeRole === 'COLABORADOR' && (
          <ColaboradorView key={`${currentTenant.id}-${currentUser.id}`} currentTenant={currentTenant} currentUser={currentUser} />
        )}

        {activeRole === 'PROFESOR' && (
          <ProfesorView key={`${currentTenant.id}-${currentUser.id}`} currentTenant={currentTenant} currentUser={currentUser} />
        )}

        {activeRole === 'JEFATURA' && (
          <JefaturaView key={`${currentTenant.id}-${currentUser.id}`} currentTenant={currentTenant} currentUser={currentUser} />
        )}

        {activeRole === 'ADMIN' && (
          <AdminView
            key={`${currentTenant.id}-${currentUser.id}`}
            currentTenant={currentTenant}
            currentUser={currentUser}
            onOpenBrandingModal={() => setIsBrandingModalOpen(true)}
          />
        )}
      </main>

      {/* Modal de Personalización de Marca White-Label */}
      <BrandingEditorModal
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
      />

      {/* Modal de Autenticación y Registro de Usuarios */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        users={users}
        currentTenant={currentTenant}
        onSelectUser={handleSelectUser}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
