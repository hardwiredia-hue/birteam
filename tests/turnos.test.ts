import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diaDeSemana,
  horariosDelDia,
  porcentajeDescuento,
  precioDelTurno,
  proximosDias,
  rotuloDia,
  seSuperponen,
} from '../src/lib/reservas';
import { montoOnline } from '../src/lib/mercadopago';

test('día de la semana sin depender de la zona del servidor', () => {
  assert.equal(diaDeSemana('2026-10-10'), 6); // sábado
  assert.equal(diaDeSemana('2026-10-11'), 0); // domingo
  assert.equal(rotuloDia('2026-10-10'), 'Sáb 10 oct');
});

test('horarios del día según apertura, cierre y duración', () => {
  assert.deepEqual(horariosDelDia({ horaApertura: 18, horaCierre: 22, duracionTurno: 60 }), [
    '18:00',
    '19:00',
    '20:00',
    '21:00',
  ]);
  assert.deepEqual(horariosDelDia({ horaApertura: 18, horaCierre: 23, duracionTurno: 90 }), [
    '18:00',
    '19:30',
    '21:00',
  ]);
  // Cierre a medianoche.
  assert.equal(horariosDelDia({ horaApertura: 22, horaCierre: 24, duracionTurno: 60 }).at(-1), '23:00');
});

test('superposición de turnos', () => {
  const h = (horas: number) => horas * 3600_000;
  assert.equal(seSuperponen(h(20), 60, h(20), 60), true);
  assert.equal(seSuperponen(h(20), 60, h(21), 60), false); // pegados, no se pisan
  assert.equal(seSuperponen(h(20), 90, h(21), 60), true);
  assert.equal(seSuperponen(h(19), 60, h(20), 90), false);
});

test('próximos días: 14 claves consecutivas desde hoy', () => {
  const dias = proximosDias();
  assert.equal(dias.length, 14);
  assert.match(dias[0], /^\d{4}-\d{2}-\d{2}$/);
  const unDia = 86400_000;
  assert.equal(Date.parse(dias[1]) - Date.parse(dias[0]), unDia);
});

test('precios: turno, seña, total y descuento', () => {
  assert.equal(precioDelTurno(30000, 90), 45000);
  assert.equal(precioDelTurno(null, 60), null);
  assert.equal(montoOnline(30000, 'SENA', 30), 9000);
  assert.equal(montoOnline(30000, 'TOTAL', 30), 30000);
  assert.equal(montoOnline(30000, 'NO', 30), null);
  assert.equal(porcentajeDescuento(30000, 21000), 30);
  assert.equal(porcentajeDescuento(null, 21000), null);
  assert.equal(porcentajeDescuento(30000, 30000), null);
});
