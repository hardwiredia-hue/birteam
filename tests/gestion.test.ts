import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { duenosQueGestiono, equipoDelComplejo, gestionaCancha } from '../src/lib/gestion';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('empleados del complejo: gestionan los turnos de las canchas del dueño y nada más', async () => {
  const { dueno, jugador, otro, cancha } = await escenario('equipo');
  assert.equal(await gestionaCancha(dueno.id, cancha), true);
  assert.equal(await gestionaCancha(jugador.id, cancha), false);

  await prisma.empleadoComplejo.create({ data: { duenoId: dueno.id, usuarioId: jugador.id } });
  assert.equal(await gestionaCancha(jugador.id, cancha), true);
  assert.equal(await gestionaCancha(otro.id, cancha), false);

  assert.deepEqual(await duenosQueGestiono(jugador.id, 'JUGADOR'), [dueno.id]);
  assert.deepEqual(await duenosQueGestiono(dueno.id, 'CANCHA'), [dueno.id]);
  assert.deepEqual(await duenosQueGestiono(otro.id, 'JUGADOR'), []);
  assert.deepEqual((await equipoDelComplejo(dueno.id)).sort(), [dueno.id, jugador.id].sort());

  // Un empleado con la cuenta eliminada deja de recibir avisos.
  await prisma.usuario.update({ where: { id: jugador.id }, data: { eliminadoEn: new Date() } });
  assert.deepEqual(await equipoDelComplejo(dueno.id), [dueno.id]);
});
