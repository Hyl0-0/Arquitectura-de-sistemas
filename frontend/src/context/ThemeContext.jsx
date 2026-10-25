import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../config';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [tenants, setTenants] = useState([]);
  const [currentTenantId, setCurrentTenantId] = useState('alumco');
  const [currentTenant, setCurrentTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [colorMode, setColorMode] = useState(() => {
    return localStorage.getItem('alumco_color_mode') || 'dark';
  });

  const toggleColorMode = () => {
    setColorMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Cargar lista de organizaciones
  const fetchTenants = async () => {
    try {
      const res = await fetch(`${API_BASE}/tenants`);
      if (res.ok) {
        const data = await res.json();
        // Asegurar que Alumco tenga el logo local asignado
        const mapped = data.map(t => {
          if (t.id === 'alumco' && (!t.logoUrl || t.logoUrl.includes('unsplash'))) {
            return { ...t, logoUrl: '/logo-alumco.png' };
          }
          return t;
        });
        setTenants(mapped);
      }
    } catch (err) {
      console.error('Error al cargar tenants:', err);
    }
  };

  // Cargar detalle y tokens cromáticos del tenant activo
  const loadTenantTheme = async (tenantId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tenants/${tenantId}`);
      if (res.ok) {
        let tenantData = await res.json();
        if (tenantData.id === 'alumco' && (!tenantData.logoUrl || tenantData.logoUrl.includes('unsplash'))) {
          tenantData.logoUrl = '/logo-alumco.png';
        }
        setCurrentTenant(tenantData);
        applyThemeTokens(tenantData.colors, colorMode);
      }
    } catch (err) {
      console.error('Error al cargar tema del tenant:', err);
    } finally {
      setLoading(false);
    }
  };

  // Inyección de tokens en el DOM root
  const applyThemeTokens = (colors, mode = colorMode) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    localStorage.setItem('alumco_color_mode', mode);

    if (mode === 'light') {
      root.style.setProperty('--bg-dark', '#f8fafc');
      root.style.setProperty('--surface', '#ffffff');
      root.style.setProperty('--surface-hover', '#f1f5f9');
      root.style.setProperty('--surface-border', 'rgba(15, 23, 42, 0.08)');
      root.style.setProperty('--text-main', '#0f172a');
      root.style.setProperty('--text-muted', '#475569');
      root.style.setProperty('--text-dim', '#94a3b8');
    } else {
      root.style.setProperty('--bg-dark', colors?.background || '#090d16');
      root.style.setProperty('--surface', colors?.surface || '#111827');
      root.style.setProperty('--surface-hover', '#1f2937');
      root.style.setProperty('--surface-border', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--text-main', '#f8fafc');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--text-dim', '#64748b');
    }

    if (colors) {
      if (colors.primary) root.style.setProperty('--primary', colors.primary);
      if (colors.primaryHover) root.style.setProperty('--primary-hover', colors.primaryHover);
      if (colors.secondary) root.style.setProperty('--secondary', colors.secondary);
      if (colors.accent) root.style.setProperty('--accent', colors.accent);
    }
  };

  // Actualizar tema del tenant en DynamoDB
  const updateTenantTheme = async (tenantId, updateData) => {
    try {
      const res = await fetch(`${API_BASE}/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentTenant(updated);
        applyThemeTokens(updated.colors);
        await fetchTenants();
        return updated;
      }
    } catch (err) {
      console.error('Error al actualizar tema:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (currentTenantId) {
      loadTenantTheme(currentTenantId);
    }
  }, [currentTenantId]);

  useEffect(() => {
    if (currentTenant?.colors) {
      applyThemeTokens(currentTenant.colors, colorMode);
    } else {
      applyThemeTokens(null, colorMode);
    }
  }, [colorMode]);

  return (
    <ThemeContext.Provider
      value={{
        tenants,
        currentTenantId,
        setCurrentTenantId,
        currentTenant,
        loading,
        updateTenantTheme,
        reloadTenants: fetchTenants,
        colorMode,
        toggleColorMode
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
