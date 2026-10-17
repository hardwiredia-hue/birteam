import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nuevoPrecio } from '../src/lib/precios';

test('actualizar precios: porcentaje y redondeo', () => {
  assert.equal(nuevoPrecio(40000, 10, 500), 44000);
  assert.equal(nuevoPrecio(37000, 15, 500), 42500, '42.550 → 42.500');
  assert.equal(nuevoPrecio(37000, 15, 1000), 43000);
  assert.equal(nuevoPrecio(37000, 15, 0), 42550);
  assert.equal(nuevoPrecio(40000, -10, 100), 36000, 'también baja');
  assert.equal(nuevoPrecio(100, -50, 1000), 0, 'nunca negativo');
});
