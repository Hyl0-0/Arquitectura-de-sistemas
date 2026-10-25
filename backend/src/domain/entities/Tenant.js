// Domain Entity: Tenant (Organización)
export class Tenant {
  constructor({
    id,
    name,
    tagline,
    logoUrl,
    faviconUrl,
    colors = {
      primary: '#0f766e',
      primaryHover: '#0d9488',
      secondary: '#0369a1',
      accent: '#f59e0b',
      background: '#090d16',
      surface: '#111827',
      text: '#f8fafc',
      muted: '#94a3b8'
    },
    sedes = ['Santiago', 'Concepción', 'Antofagasta'],
    createdAt = new Date().toISOString()
  }) {
    if (!id || !name) {
      throw new Error('Tenant requires an id and name');
    }
    this.id = id;
    this.name = name;
    this.tagline = tagline || `Plataforma de Capacitación y Cumplimiento - ${name}`;
    this.logoUrl = logoUrl || '';
    this.faviconUrl = faviconUrl || '';
    this.colors = colors;
    this.sedes = sedes;
    this.createdAt = createdAt;
  }
}
