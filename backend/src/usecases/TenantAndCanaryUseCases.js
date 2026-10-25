import { Tenant } from '../domain/entities/Tenant.js';

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

    // Regla de distribución probabilística basada en hash o número aleatorio
    const randomVal = Math.floor(Math.random() * 100);
    const isCanary = randomVal < config.weight;

    return {
      version: isCanary ? 'canary' : 'stable',
      weight: config.weight,
      reason: isCanary ? 'TRAFFIC_SPLIT_CANARY' : 'TRAFFIC_SPLIT_STABLE'
    };
  }
}
