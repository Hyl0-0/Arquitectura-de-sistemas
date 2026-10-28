import { createHash } from 'node:crypto';
import { Tenant } from '../domain/entities/Tenant.js';

// Convierte un userId en un número fijo entre 0 y 99 (el "casillero" del usuario).
// Mismo userId => mismo casillero, siempre. Un usuario va al canario si su casillero < peso configurado.
export function canaryBucket(userId) {
  const digest = createHash('sha256').update(String(userId)).digest();
  return digest.readUInt32BE(0) % 100;
}

export class TenantThemingUseCase {
  constructor({ tenantRepository }) {
    this.tenantRepository = tenantRepository;
  }

  async getTheme(tenantId) {
    let tenant = await this.tenantRepository.getById(tenantId);
    if (!tenant) {
      // Si no existe, crear o devolver el por defecto (Alumco)
      tenant = new Tenant({
        id: tenantId || 'alumco',
        name: tenantId === 'alumco' ? 'Alumco ONG' : tenantId,
        tagline: 'Plataforma Oficial de Capacitación, Inducción y Seguridad',
        colors: {
          primary: '#1e3a8a',       // Azul Alumco
          primaryHover: '#1d4ed8',
          secondary: '#0284c7',
          accent: '#f59e0b',
          background: '#090d16',
          surface: '#111827',
          text: '#f8fafc',
          muted: '#94a3b8'
        },
        sedes: ['Sede Central', 'Sede Norte', 'Sede Sur']
      });
      await this.tenantRepository.save(tenant);
    }
    return tenant;
  }

  async updateTheme(tenantId, updateData) {
    let tenant = await this.tenantRepository.getById(tenantId);
    if (!tenant) {
      tenant = new Tenant({ id: tenantId, name: updateData.name || tenantId });
    }

    if (updateData.name) tenant.name = updateData.name;
    if (updateData.tagline) tenant.tagline = updateData.tagline;
    if (updateData.logoUrl !== undefined) tenant.logoUrl = updateData.logoUrl;
    if (updateData.colors) tenant.colors = { ...tenant.colors, ...updateData.colors };
    if (updateData.sedes) tenant.sedes = updateData.sedes;

    await this.tenantRepository.save(tenant);
    return tenant;
  }

  async listTenants() {
    return await this.tenantRepository.listAll();
  }
}

export class CanaryRoutingUseCase {
  constructor({ canaryConfigRepository }) {
    this.canaryConfigRepository = canaryConfigRepository;
  }

  async getCanaryStatus() {
    return await this.canaryConfigRepository.getConfig();
  }

  async updateCanaryWeight(percentCanary) {
    const clamped = Math.max(0, Math.min(100, Number(percentCanary)));
    return await this.canaryConfigRepository.updateWeight(clamped);
  }

  async routeRequest(userId, tenantId) {
    const config = await this.canaryConfigRepository.getConfig();
    
    // Si la organización o usuario está en la lista de prueba canaria
    if (config.pilotTenants && config.pilotTenants.includes(tenantId)) {
      return { version: 'canary', reason: 'PILOT_TENANT' };
    }

    // Sin userId no podemos asignar un "casillero" estable: va a la versión estable (la más segura)
    if (!userId) {
      return { version: 'stable', weight: config.weight, reason: 'NO_USER_ID' };
    }

    // Distribución determinista: el mismo usuario siempre cae en el mismo casillero (0-99)
    const bucket = canaryBucket(userId);
    const isCanary = bucket < config.weight;

    return {
      version: isCanary ? 'canary' : 'stable',
      weight: config.weight,
      bucket,
      reason: isCanary ? 'TRAFFIC_SPLIT_CANARY' : 'TRAFFIC_SPLIT_STABLE'
    };
  }
}
