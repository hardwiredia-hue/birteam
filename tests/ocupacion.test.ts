import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ocupacionPorFranja } from '../src/lib/ocupacion';

// Dos lunes y dos martes (5, 6, 12 y 13 de octubre de 2026).
const fechas = ['2026-10-05', '2026-10-06', '2026-10-12', '2026-10-13'];
const cancha = {
  id: 'c1',
  diasDisponibles: '[1]', // solo lunes
  horaApertura: 20,
  horaCierre: 22,
  duracionTurno: 60,
};

test('ocupación por franja: cuenta ofrecidos y tomados por día y hora', () => {
  const r = ocupacionPorFranja([cancha], fechas, [
    { canchaId: 'c1', fecha: '2026-10-05', hora: '21:00' },
    { canchaId: 'c1', fecha: '2026-10-12', hora: '21:00' },
    { canchaId: 'c1', fecha: '2026-10-12', hora: '20:00' },
    { canchaId: 'otra', fecha: '2026-10-12', hora: '20:00' }, // de otra cancha: no cuenta
  ]);
  assert.deepEqual(r.horas, [20, 21]);
  assert.deepEqual(r.franja(1, 21), { dia: 1, hora: 21, ofrecidos: 2, tomados: 2 });
  assert.deepEqual(r.franja(1, 20), { dia: 1, hora: 20, ofrecidos: 2, tomados: 1 });
  assert.equal(r.franja(2, 21), null, 'el martes no abre');
  assert.equal(r.ofrecidos, 4);
  assert.equal(r.tomados, 3);
  assert.equal(r.masPedidas[0].hora, 21);
  assert.deepEqual(r.masFlojas, [], 'ninguna franja quedó por debajo del 25%');
});

test('ocupación por franja: turnos de 90 minutos se agrupan por la hora en que empiezan', () => {
  const r = ocupacionPorFranja([{ ...cancha, horaApertura: 18, horaCierre: 21, duracionTurno: 90 }], fechas, []);
  // 18:00 y 19:30
  assert.deepEqual(r.horas, [18, 19]);
  assert.deepEqual(ocupacionPorFranja([{ ...cancha, horaApertura: 8, horaCierre: 13, duracionTurno: 90 }], fechas, []).horas, [8, 9, 10, 11], 'sin huecos: 8:00, 9:30, 11:00 → 8 a 11');
  assert.equal(r.masFlojas.length, 2);
});
