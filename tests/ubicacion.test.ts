import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dentroDelRadio, kmHasta, leerCoordenadas, radioDelParametro } from '../src/lib/ubicacion';

test('ubicación: coordenadas de la cookie', () => {
  assert.deepEqual(leerCoordenadas('-32.891,-60.701'), { latitud: -32.891, longitud: -60.701 });
  assert.equal(leerCoordenadas(''), null);
  assert.equal(leerCoordenadas('hola'), null);
  assert.equal(leerCoordenadas('-95,10'), null);
  assert.equal(leerCoordenadas('10,200'), null);
});

test('ubicación: solo los radios que se ofrecen', () => {
  assert.equal(radioDelParametro('5'), 5);
  assert.equal(radioDelParametro('7'), null);
  assert.equal(radioDelParametro('15'), 15);
  assert.equal(radioDelParametro(undefined), null);
});

test('ubicación: distancia y radio', () => {
  const rosario = { latitud: -32.9468, longitud: -60.6393 };
  const km = kmHasta(rosario, { latitud: -32.89, longitud: -60.7 });
  assert.ok(km != null && km > 8 && km < 9.5, `km=${km}`);
  assert.equal(kmHasta(null, { latitud: 1, longitud: 1 }), null);
  assert.equal(kmHasta(rosario, { latitud: null, longitud: null }), null);
  assert.equal(dentroDelRadio(km, 10), true);
  assert.equal(dentroDelRadio(km, 5), false);
  // Sin radio entra todo; con radio, lo que no tiene ubicación queda afuera.
  assert.equal(dentroDelRadio(null, null), true);
  assert.equal(dentroDelRadio(null, 5), false);
});

test('ubicación: distancia aproximada sin falsa precisión', async () => {
  const { rotuloDistancia } = await import('../src/lib/geo');
  assert.equal(rotuloDistancia(0.003, false), 'a 3 m');
  assert.equal(rotuloDistancia(0.003, true), 'en tu zona');
  assert.equal(rotuloDistancia(2.9, true), 'en tu zona');
  assert.equal(rotuloDistancia(12.4, true), 'a ~12 km');
  assert.equal(rotuloDistancia(4.5, true), 'a ~4,5 km');
});

test('formato: cuánto hace, corto', async () => {
  const { haceCuanto } = await import('../src/lib/formato');
  const ahora = new Date('2026-10-13T15:00:00-03:00');
  const antes = (min: number) => new Date(ahora.getTime() - min * 60_000);
  assert.equal(haceCuanto(antes(0.2), ahora), 'recién');
  assert.equal(haceCuanto(antes(5), ahora), 'hace 5 min');
  assert.equal(haceCuanto(antes(130), ahora), 'hace 2 h');
  assert.equal(haceCuanto(antes(26 * 60), ahora), 'ayer');
  assert.equal(haceCuanto(antes(3 * 24 * 60), ahora), 'hace 3 días');
  assert.equal(haceCuanto(new Date('2026-10-01T12:00:00-03:00'), ahora), '1 oct');
});
