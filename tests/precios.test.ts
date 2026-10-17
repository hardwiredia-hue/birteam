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

test('precio del turno con horario pico (sin base de datos, lo usa el navegador)', async () => {
  const { precioDelTurnoEn } = await import('../src/lib/precios');
  const cancha = { precioPorHora: 40000, precioPico: 50000, picoDesdeHora: 20, picoFinDeSemana: true, duracionTurno: 90 };
  assert.equal(precioDelTurnoEn(cancha, '2026-10-21', '19:00'), 60000, 'miércoles 19 h: normal, 1 h 30');
  assert.equal(precioDelTurnoEn(cancha, '2026-10-21', '21:00'), 75000, 'desde las 20: pico');
  assert.equal(precioDelTurnoEn(cancha, '2026-10-17', '10:00'), 75000, 'sábado: pico todo el día');
  assert.equal(precioDelTurnoEn({ ...cancha, precioPorHora: null, precioPico: null }, '2026-10-21', '19:00'), null);
});
