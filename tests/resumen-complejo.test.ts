import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { esHoraDelResumen, resumenDeLaManana } from '../src/lib/resumen-complejo';
import { claveOcupa, claveDia } from '../src/lib/reservas';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('resumen de la mañana: entre las 8 y las 11, una vez por día y con algo para contar', async () => {
  assert.ok(esHoraDelResumen(new Date('2026-10-17T12:30:00Z')), '9:30 en Argentina');
  assert.ok(!esHoraDelResumen(new Date('2026-10-17T15:00:00Z')), '12:00 en Argentina');

  const { cancha, dueno, jugador } = await escenario(`resu${Date.now()}`);
  const ahora = new Date('2026-10-17T12:30:00Z');
  const hoy = claveDia(ahora);
  await prisma.reserva.create({
    data: { canchaId: cancha.id, usuarioId: jugador.id, fecha: hoy, hora: '20:00', inicio: new Date(`${hoy}T20:00:00-03:00`), estado: 'CONFIRMADA', ocupa: claveOcupa(cancha.id, hoy, '20:00') },
  });
  await prisma.reserva.create({
    data: { canchaId: cancha.id, usuarioId: jugador.id, fecha: hoy, hora: '21:00', inicio: new Date(`${hoy}T21:00:00-03:00`), estado: 'SOLICITADA', ocupa: claveOcupa(cancha.id, hoy, '21:00') },
  });

  await resumenDeLaManana(ahora);
  const avisos = await prisma.notificacion.findMany({ where: { usuarioId: dueno.id, tipo: 'RESUMEN_DIA' } });
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].cuerpo, '1 turno confirmado hoy · 1 pedido espera tu respuesta.');
  await resumenDeLaManana(new Date(ahora.getTime() + 30 * 60_000));
  assert.equal(await prisma.notificacion.count({ where: { usuarioId: dueno.id, tipo: 'RESUMEN_DIA' } }), 1, 'una vez por día');
});
