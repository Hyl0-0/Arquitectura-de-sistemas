// Pruebas unitarias de los patrones de resiliencia: Circuit Breaker y Bulkhead.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { CircuitBreakerState } from '../src/domain/entities/ResilienceAndAssessments.js';
import { BulkheadQueue } from '../src/adapters/ServicesAndCanary.js';

const { CLOSED, OPEN, HALF_OPEN } = CircuitBreakerState.STATES;

describe('Circuit Breaker', () => {
  test('parte CLOSED y permite llamadas', () => {
    const cb = new CircuitBreakerState({});
    assert.equal(cb.state, CLOSED);
    assert.equal(cb.isCallPermitted(), true);
  });

  test('con menos de 5 fallos sigue CLOSED', () => {
    const cb = new CircuitBreakerState({});
    for (let i = 0; i < 4; i++) cb.recordFailure();
    assert.equal(cb.failureCount, 4);
    assert.equal(cb.state, CLOSED);
    assert.equal(cb.isCallPermitted(), true);
  });

  test('al 5to fallo consecutivo pasa a OPEN y bloquea las llamadas', () => {
    const cb = new CircuitBreakerState({});
    for (let i = 0; i < 5; i++) cb.recordFailure();
    assert.equal(cb.state, OPEN);
    assert.equal(cb.isCallPermitted(), false);
  });

  test('un éxito reinicia el contador y vuelve a CLOSED', () => {
    const cb = new CircuitBreakerState({});
    for (let i = 0; i < 3; i++) cb.recordFailure();
    cb.recordSuccess();
    assert.equal(cb.failureCount, 0);
    assert.equal(cb.state, CLOSED);
  });

  test('pasado el cooldown (60 s) OPEN pasa a HALF_OPEN y deja una llamada de prueba', () => {
    // Simulamos que el último fallo ocurrió hace 61 segundos
    const cb = new CircuitBreakerState({
      state: OPEN,
      failureCount: 5,
      lastFailureTime: new Date(Date.now() - 61 * 1000).toISOString()
    });
    assert.equal(cb.isCallPermitted(), true);
    assert.equal(cb.state, HALF_OPEN);
  });

  test('antes de cumplirse el cooldown sigue OPEN', () => {
    const cb = new CircuitBreakerState({
      state: OPEN,
      failureCount: 5,
      lastFailureTime: new Date(Date.now() - 10 * 1000).toISOString()
    });
    assert.equal(cb.isCallPermitted(), false);
    assert.equal(cb.state, OPEN);
  });

  test('si la llamada de prueba (HALF_OPEN) falla, vuelve a OPEN', () => {
    const cb = new CircuitBreakerState({ state: HALF_OPEN, failureCount: 5 });
    cb.recordFailure();
    assert.equal(cb.state, OPEN);
  });

  test('si la llamada de prueba (HALF_OPEN) funciona, vuelve a CLOSED', () => {
    const cb = new CircuitBreakerState({ state: HALF_OPEN, failureCount: 5 });
    cb.recordSuccess();
    assert.equal(cb.state, CLOSED);
    assert.equal(cb.failureCount, 0);
  });
});

describe('Bulkhead', () => {
  test('nunca ejecuta más tareas simultáneas que el máximo y encola el resto', async () => {
    const bulkhead = new BulkheadQueue(2);
    let enParalelo = 0;
    let maximoObservado = 0;

    const tarea = async () => {
      enParalelo++;
      maximoObservado = Math.max(maximoObservado, enParalelo);
      await new Promise(resolve => setTimeout(resolve, 30));
      enParalelo--;
    };

    // Lanzamos 5 tareas a la vez; solo 2 pueden correr al mismo tiempo
    await Promise.all([1, 2, 3, 4, 5].map(() => bulkhead.execute(tarea)));

    assert.equal(maximoObservado, 2);
    assert.deepEqual(bulkhead.getStatus(), {
      maxConcurrency: 2,
      currentRunning: 0,
      waitingInQueue: 0
    });
  });

  test('devuelve el resultado de la tarea', async () => {
    const bulkhead = new BulkheadQueue(2);
    const resultado = await bulkhead.execute(async () => 'ok');
    assert.equal(resultado, 'ok');
  });
});
