import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esClaveValida, franjaDe, leerDisponibilidad, puedeJugar, resumenDisponibilidad } from '../src/lib/disponibilidad';

test('disponibilidad: franjas en hora argentina y quién puede', () => {
  // Sábado 17 de octubre de 2026.
  assert.deepEqual(franjaDe(new Date('2026-10-17T13:00:00Z')), { dia: 6, franja: 'manana' }, '10:00');
  assert.deepEqual(franjaDe(new Date('2026-10-17T18:00:00Z')), { dia: 6, franja: 'tarde' }, '15:00');
  assert.deepEqual(franjaDe(new Date('2026-10-18T00:30:00Z')), { dia: 6, franja: 'noche' }, '21:30');
  assert.deepEqual(franjaDe(new Date('2026-10-18T03:30:00Z')), { dia: 6, franja: 'noche' }, '00:30 del domingo cuenta como la noche del sábado');

  assert.ok(puedeJugar('[]', new Date('2026-10-18T00:30:00Z')), 'sin cargar, siempre');
  assert.ok(puedeJugar('["6-noche"]', new Date('2026-10-18T00:30:00Z')));
  assert.ok(!puedeJugar('["6-tarde","2-noche"]', new Date('2026-10-18T00:30:00Z')));

  assert.ok(esClaveValida('0-manana'));
  assert.ok(!esClaveValida('7-noche'));
  assert.ok(!esClaveValida('2-madrugada'));
  assert.deepEqual(leerDisponibilidad('["2-noche","x","9-tarde"]'), ['2-noche']);
  assert.equal(resumenDisponibilidad('["1-noche","3-noche","6-tarde"]'), 'Sáb a la tarde · Lun y Mié a la noche');
  assert.equal(resumenDisponibilidad('[]'), null);
});
