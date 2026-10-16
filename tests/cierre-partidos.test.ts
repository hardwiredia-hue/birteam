import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { cerrarPartidosSinLista, recordarPasarLista } from '../src/lib/cierre-partidos';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('después del partido: recordatorio de lista y cierre a las 48 h', async () => {
  const { deporte, jugador, otro, dueno } = await escenario(`cie${Date.now()}`);
  const ahora = new Date();
  const hace = (horas: number) => new Date(ahora.getTime() - horas * 3600_000);
  const base = { deporteId: deporte.id, organizadorId: jugador.id, lugarNombre: 'Club', cupo: 10, minimo: 2, duracionMin: 60 };
  const dos = { create: [{ usuarioId: jugador.id, estado: 'VOY' }, { usuarioId: otro.id, estado: 'VOY' }] };

  const recien = await prisma.partido.create({ data: { ...base, fecha: hace(2), participaciones: dos } });
  assert.equal(await recordarPasarLista(ahora), 1);
  assert.equal(await recordarPasarLista(ahora), 0, 'una sola vez');
  assert.equal(await prisma.notificacion.count({ where: { usuarioId: jugador.id, tipo: 'PASAR_LISTA', url: `/partidos/${recien.id}#lista` } }), 1);

  const viejo = await prisma.partido.create({
    data: {
      ...base,
      fecha: hace(50),
      participaciones: { create: [{ usuarioId: jugador.id, estado: 'VOY' }, { usuarioId: otro.id, estado: 'VOY', asistio: false }, { usuarioId: dueno.id, estado: 'NOVOY' }] },
    },
  });
  const flojo = await prisma.partido.create({
    data: { ...base, minimo: 6, fecha: hace(50), participaciones: dos },
  });
  const cancelado = await prisma.partido.create({ data: { ...base, fecha: hace(50), estado: 'CANCELADO', participaciones: dos } });

  await cerrarPartidosSinLista(ahora);
  const cerrado = await prisma.partido.findUniqueOrThrow({ where: { id: viejo.id }, include: { participaciones: true } });
  assert.equal(cerrado.estado, 'JUGADO');
  const asistio = Object.fromEntries(cerrado.participaciones.map((p) => [p.usuarioId, p.asistio]));
  assert.equal(asistio[jugador.id], true, 'sin marcar: fue');
  assert.equal(asistio[otro.id], false, 'lo que marcó el organizador se respeta');
  assert.equal(asistio[dueno.id], null, 'los "no voy" no cuentan');
  assert.equal((await prisma.partido.findUniqueOrThrow({ where: { id: flojo.id } })).estado, 'ARMANDOSE', 'sin el mínimo, queda');
  assert.equal((await prisma.partido.findUniqueOrThrow({ where: { id: cancelado.id } })).estado, 'CANCELADO');
  assert.equal((await prisma.partido.findUniqueOrThrow({ where: { id: recien.id } })).estado, 'ARMANDOSE', 'el de recién no se cierra');
});
