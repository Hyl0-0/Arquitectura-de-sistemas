// Pruebas del enrutamiento canario determinista (por hash del userId).
// Se ejecutan con: npm test (dentro de la carpeta backend)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { CanaryRoutingUseCase, canaryBucket } from '../src/usecases/TenantAndCanaryUseCases.js';

// Repositorio falso en memoria: evita depender de DynamoDB en las pruebas
function crearUseCase({ weight = 10, pilotTenants = [] } = {}) {
  const config = { weight, pilotTenants };
  const repo = {
    getConfig: async () => config,
    updateWeight: async (nuevoPeso) => {
      config.weight = nuevoPeso;
      return config;
    }
  };
  return new CanaryRoutingUseCase({ canaryConfigRepository: repo });
}

const usuarios = Array.from({ length: 2000 }, (_, i) => `usr_${i}`);

describe('canaryBucket (casillero del usuario)', () => {
  test('devuelve siempre un entero entre 0 y 99', () => {
    for (const u of usuarios.slice(0, 200)) {
      const b = canaryBucket(u);
      assert.ok(Number.isInteger(b) && b >= 0 && b <= 99, `casillero inválido: ${b}`);
    }
  });

  test('es determinista: el mismo userId da siempre el mismo casillero', () => {
    assert.equal(canaryBucket('usr_colaborador1'), canaryBucket('usr_colaborador1'));
  });
});

describe('CanaryRoutingUseCase.routeRequest', () => {
  test('el mismo usuario recibe siempre la misma versión', async () => {
    const useCase = crearUseCase({ weight: 30 });
    const primera = await useCase.routeRequest('usr_colaborador1', 'alumco');
    for (let i = 0; i < 50; i++) {
      const r = await useCase.routeRequest('usr_colaborador1', 'alumco');
      assert.equal(r.version, primera.version);
    }
  });

  test('con peso 0 todos van a stable y con peso 100 todos van a canary', async () => {
    const en0 = crearUseCase({ weight: 0 });
    const en100 = crearUseCase({ weight: 100 });
    for (const u of usuarios.slice(0, 200)) {
      assert.equal((await en0.routeRequest(u, 'alumco')).version, 'stable');
      assert.equal((await en100.routeRequest(u, 'alumco')).version, 'canary');
    }
  });

  test('el reparto se parece al peso configurado (10% ± 3 puntos con 2000 usuarios)', async () => {
    const useCase = crearUseCase({ weight: 10 });
    let canary = 0;
    for (const u of usuarios) {
      if ((await useCase.routeRequest(u, 'alumco')).version === 'canary') canary++;
    }
    const porcentaje = (canary / usuarios.length) * 100;
    assert.ok(porcentaje >= 7 && porcentaje <= 13, `porcentaje observado: ${porcentaje}%`);
  });

  test('al subir el peso de 10 a 50 nadie sale del canario (promoción gradual)', async () => {
    const useCase = crearUseCase({ weight: 10 });
    const enCanarioAl10 = [];
    for (const u of usuarios) {
      if ((await useCase.routeRequest(u, 'alumco')).version === 'canary') enCanarioAl10.push(u);
    }

    await useCase.updateCanaryWeight(50);
    for (const u of enCanarioAl10) {
      assert.equal((await useCase.routeRequest(u, 'alumco')).version, 'canary');
    }
  });

  test('una organización piloto siempre va al canario, aunque el peso sea 0', async () => {
    const useCase = crearUseCase({ weight: 0, pilotTenants: ['clinica'] });
    const r = await useCase.routeRequest('usr_1', 'clinica');
    assert.equal(r.version, 'canary');
    assert.equal(r.reason, 'PILOT_TENANT');
  });

  test('sin userId va a stable (la opción más segura)', async () => {
    const useCase = crearUseCase({ weight: 100 });
    const r = await useCase.routeRequest(undefined, 'alumco');
    assert.equal(r.version, 'stable');
    assert.equal(r.reason, 'NO_USER_ID');
  });
});

describe('CanaryRoutingUseCase.updateCanaryWeight', () => {
  test('limita el peso entre 0 y 100', async () => {
    const useCase = crearUseCase();
    assert.equal((await useCase.updateCanaryWeight(150)).weight, 100);
    assert.equal((await useCase.updateCanaryWeight(-5)).weight, 0);
    assert.equal((await useCase.updateCanaryWeight(30)).weight, 30);
  });
});
