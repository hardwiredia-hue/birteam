import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pasosDelComplejo } from '../src/lib/puesta-a-punto';

const completa = {
  id: 'c1',
  fotos: '["/api/archivos/a.jpg"]',
  precioPorHora: 30000,
  telefono: '341 555 0000',
  reservasOnline: true,
  techada: false,
  superficie: 'SINTETICO',
  servicios: '[]',
};

test('puesta a punto: un complejo nuevo arranca por publicar la cancha', () => {
  const pasos = pasosDelComplejo({ canchas: [], mercadoPagoDisponible: true, mercadoPagoConectado: false, verificacion: 'PENDIENTE' });
  assert.equal(pasos.filter((p) => p.hecho).length, 0);
  assert.equal(pasos[0].clave, 'cancha');
  assert.equal(pasos[0].href, '/canchas/nueva');
});

test('puesta a punto: cada paso apunta a la cancha que le falta algo', () => {
  const pasos = pasosDelComplejo({
    canchas: [completa, { ...completa, id: 'c2', fotos: '[]', precioPorHora: null, superficie: null, servicios: '["BUFFET"]' }],
    mercadoPagoDisponible: false,
    mercadoPagoConectado: false,
    verificacion: 'EN_REVISION',
  });
  const por = Object.fromEntries(pasos.map((p) => [p.clave, p]));
  assert.equal(por.fotos.hecho, false);
  assert.equal(por.fotos.href, '/canchas/c2/editar');
  assert.equal(por.precio.href, '/canchas/c2/editar');
  assert.equal(por['como-es'].hecho, true);
  assert.equal(por.mercadopago, undefined, 'sin cobro online habilitado, no se pide');
  assert.equal(por.verificacion.hecho, true, 'en revisión no depende del dueño');
});

test('puesta a punto: con todo cargado, todos los pasos hechos', () => {
  const pasos = pasosDelComplejo({ canchas: [completa], mercadoPagoDisponible: true, mercadoPagoConectado: true, verificacion: 'VERIFICADA' });
  assert.ok(pasos.every((p) => p.hecho));
});
