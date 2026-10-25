import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export function BrandingEditorModal({ isOpen, onClose }) {
  const { currentTenant, updateTenantTheme } = useTheme();

  const [name, setName] = useState(currentTenant?.name || '');
  const [tagline, setTagline] = useState(currentTenant?.tagline || '');
  const [primaryColor, setPrimaryColor] = useState(currentTenant?.colors?.primary || '#1e3a8a');
  const [secondaryColor, setSecondaryColor] = useState(currentTenant?.colors?.secondary || '#0284c7');
  const [accentColor, setAccentColor] = useState(currentTenant?.colors?.accent || '#f59e0b');
  const [logoUrl, setLogoUrl] = useState(currentTenant?.logoUrl || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !currentTenant) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateTenantTheme(currentTenant.id, {
        name,
        tagline,
        logoUrl,
        colors: {
          ...currentTenant.colors,
          primary: primaryColor,
          primaryHover: primaryColor,
          secondary: secondaryColor,
          accent: accentColor
        }
      });
      alert('¡Configuración corporativa actualizada y sincronizada en DynamoDB!');
      onClose();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="glass-card" style={{ maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Personalización White-Label (Multi-Tenant)</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Ajusta la identidad de <strong>{currentTenant.name}</strong> sin recompilar la aplicación.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.85rem' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nombre de la Organización</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Eslogan / Subtítulo Institucional</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">URL del Logotipo</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="form-input"
              placeholder="https://... o /logo-alumco.png"
            />
          </div>

          {/* Selector de Colores Dinámico */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', margin: '1rem 0' }}>
            <div className="form-group">
              <label className="form-label">Color Primario</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ width: '38px', height: '38px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.75rem', padding: '0.4rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Color Secundario</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  style={{ width: '38px', height: '38px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.75rem', padding: '0.4rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Color de Acento</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{ width: '38px', height: '38px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.75rem', padding: '0.4rem' }}
                />
              </div>
            </div>
          </div>

          {/* Previsualización en tiempo real */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--surface-border)', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Muestra de Botones con el Nuevo Tema:</span>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: primaryColor, color: '#fff', fontSize: '0.78rem', fontWeight: 600 }}>
                Primario
              </div>
              <div style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: secondaryColor, color: '#fff', fontSize: '0.78rem', fontWeight: 600 }}>
                Secundario
              </div>
              <div style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: accentColor, color: '#000', fontSize: '0.78rem', fontWeight: 600 }}>
                Acento
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Guardando en DynamoDB...' : '💾 Guardar en DynamoDB y Aplicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
