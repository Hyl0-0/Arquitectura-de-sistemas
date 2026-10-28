import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CircuitBreakerState } from '../src/domain/entities/ResilienceAndAssessments.js';

const { CLOSED, OPEN, HALF_OPEN } = CircuitBreakerState.STATES;

// Devuelve una fecha ISO "hace N segundos" para simular el paso del tiempo
// sin esperar de verdad.
const haceSegundos = (n) => new Date(Date.now() - n * 1000).toISOString();

describe('Circuit Breaker: estado efectivo (lo que muestra el panel)', () => {
  test('CLOSED se mantiene CLOSED', () => {
    const cb = new CircuitBreakerState({});
    assert.equal(cb.getEffectiveState(), CLOSED);
  });

  test('OPEN dentro del cooldown se muestra OPEN', () => {
    const cb = new CircuitBreakerState({ state: OPEN, failureCount: 5, lastFailureTime: haceSegundos(10) });
    assert.equal(cb.getEffectiveState(), OPEN);
  });

  test('OPEN con el cooldown cumplido se muestra HALF_OPEN', () => {
    const cb = new CircuitBreakerState({ state: OPEN, failureCount: 5, lastFailureTime: haceSegundos(61) });
    assert.equal(cb.getEffectiveState(), HALF_OPEN);
  });

  test('en el segundo exacto del cooldown ya se muestra HALF_OPEN', () => {
    const cb = new CircuitBreakerState({ state: OPEN, failureCount: 5, lastFailureTime: haceSegundos(60) });
    assert.equal(cb.getEffectiveState(), HALF_OPEN);
  });

  test('HALF_OPEN guardado se mantiene HALF_OPEN', () => {
    const cb = new CircuitBreakerState({ state: HALF_OPEN, failureCount: 5, lastFailureTime: haceSegundos(5) });
    assert.equal(cb.getEffectiveState(), HALF_OPEN);
  });

  test('un fallo nuevo reinicia el cooldown y vuelve a mostrar OPEN', () => {
    const cb = new CircuitBreakerState({ state: OPEN, failureCount: 5, lastFailureTime: haceSegundos(61) });
    assert.equal(cb.getEffectiveState(), HALF_OPEN);
    cb.recordFailure();
    assert.equal(cb.getEffectiveState(), OPEN);
  });

  test('OPEN sin lastFailureTime se queda OPEN (no hay desde cuándo contar)', () => {
    const cb = new CircuitBreakerState({ state: OPEN, failureCount: 5, lastFailureTime: null });
    assert.equal(cb.getEffectiveState(), OPEN);
  });

  test('consultar el estado efectivo no modifica el estado guardado', () => {
    const cb = new CircuitBreakerState({ state: OPEN, failureCount: 5, lastFailureTime: haceSegundos(61) });
    cb.getEffectiveState();
    assert.equal(cb.state, OPEN);
    assert.equal(cb.failureCount, 5);
  });

  test('respeta un cooldown distinto de 60 segundos', () => {
    const cb = new CircuitBreakerState({
      state: OPEN, failureCount: 5, cooldownSeconds: 10, lastFailureTime: haceSegundos(11)
    });
    assert.equal(cb.getEffectiveState(), HALF_OPEN);
  });

  test('coincide con isCallPermitted: HALF_OPEN efectivo implica llamada permitida', () => {
    const cb = new CircuitBreakerState({ state: OPEN, failureCount: 5, lastFailureTime: haceSegundos(61) });
    assert.equal(cb.getEffectiveState(), HALF_OPEN);
    assert.equal(cb.isCallPermitted(), true);
  });
});
