import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerServicios, resumenCancha } from '../src/lib/servicios-cancha';
import { hayPronostico, resumirPronostico } from '../src/lib/pronostico';
import { diaDeLaSemana, fechaArgentina } from '../src/lib/formato';

test('servicios de la cancha: solo los válidos, en orden, y el resumen', () => {
  assert.deepEqual(leerServicios('["DUCHAS","ILUMINACION","CUALQUIERA"]'), ['ILUMINACION', 'DUCHAS']);
  assert.deepEqual(leerServicios('roto'), []);
  assert.deepEqual(resumenCancha({ techada: true, superficie: 'SINTETICO', servicios: '["BUFFET"]' }), [
    'Techada',
    'Césped sintético',
    'Buffet',
  ]);
  assert.deepEqual(resumenCancha({ techada: false, superficie: null, servicios: '[]' }), []);
});

test('pronóstico: resume las horas del partido (lluvia máxima, peor cielo)', () => {
  const datos = {
    hourly: {
      time: ['2026-10-17T23:00', '2026-10-18T00:00', '2026-10-18T01:00'],
      temperature_2m: [19.6, 18.2, 17],
      precipitation_probability: [20, 70, 90],
      weather_code: [3, 61, 95],
      wind_speed_10m: [10, 32, 40],
    },
  };
  // 20:00 en Argentina = 23:00 UTC; 90 minutos → dos horas del pronóstico.
  const pronostico = resumirPronostico(datos, new Date('2026-10-17T23:00:00Z'), 90);
  assert.deepEqual(pronostico, { temperatura: 20, lluvia: 70, viento: 32, cielo: 'Lluvia', mojado: true });
  // Fuera del pronóstico: nada.
  assert.equal(resumirPronostico(datos, new Date('2026-10-25T23:00:00Z'), 60), null);
  assert.equal(resumirPronostico({}, new Date('2026-10-17T23:00:00Z'), 60), null);
  // Despejado y sin lluvia: no "mojado".
  const seco = resumirPronostico({ hourly: { ...datos.hourly, precipitation_probability: [0, 0, 0], weather_code: [0, 1, 0] } }, new Date('2026-10-17T23:00:00Z'), 60);
  assert.equal(seco?.mojado, false);
  assert.equal(seco?.cielo, 'Despejado');
});

test('pronóstico: solo para partidos que no terminaron y dentro de 7 días', () => {
  const ahora = new Date('2026-10-16T12:00:00Z');
  assert.ok(hayPronostico(new Date('2026-10-17T23:00:00Z'), 60, ahora));
  assert.ok(hayPronostico(new Date('2026-10-16T11:30:00Z'), 60, ahora), 'en juego');
  assert.ok(!hayPronostico(new Date('2026-10-16T10:00:00Z'), 60, ahora), 'terminado');
  assert.ok(!hayPronostico(new Date('2026-10-24T13:00:00Z'), 60, ahora), 'muy lejos');
});

test('fechas en hora argentina aunque el servidor esté en UTC', () => {
  // Sábado 17 a las 22:00 en Argentina = domingo 18 a la 01:00 UTC.
  const tarde = new Date('2026-10-18T01:00:00Z');
  assert.equal(tarde.getUTCDay(), 0);
  assert.equal(diaDeLaSemana(tarde), 6);
  assert.deepEqual(fechaArgentina(tarde), { diaSemana: 6, dia: 17, mes: 9 });
  assert.equal(diaDeLaSemana(new Date('2026-10-18T15:00:00Z')), 0);
});
