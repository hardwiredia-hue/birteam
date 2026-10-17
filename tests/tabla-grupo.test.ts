import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { jugaronJuntos, tablaDelGrupo } from '../src/lib/tabla-grupo';
import { proximoIgual } from '../src/lib/reservas';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('tabla del grupo y "jugaron juntos"', async () => {
  const sufijo = `tab${Date.now()}`;
  const { deporte, jugador, otro, dueno } = await escenario(sufijo);
  const grupo = await prisma.grupo.create({
    data: {
      nombre: `Grupo ${sufijo}`,
      slug: `grupo-${sufijo}`,
      deporteId: deporte.id,
      creadorId: jugador.id,
      miembros: { create: [{ usuarioId: jugador.id, rol: 'ADMIN' }, { usuarioId: otro.id }] },
    },
  });
  const viejo = new Date(Date.now() - 10 * 86400_000);
  const base = { deporteId: deporte.id, grupoId: grupo.id, organizadorId: jugador.id, lugarNombre: 'Club', cupo: 10, estado: 'JUGADO', fecha: viejo };
  // Partido 1: los dos fueron (otro sin marcar = fue); figura: otro con 2 votos.
  const p1 = await prisma.partido.create({
    data: { ...base, participaciones: { create: [{ usuarioId: jugador.id, estado: 'VOY', asistio: true }, { usuarioId: otro.id, estado: 'VOY' }] } },
  });
  await prisma.votoFigura.createMany({
    data: [
      { partidoId: p1.id, votanteId: jugador.id, elegidoId: otro.id },
      { partidoId: p1.id, votanteId: dueno.id, elegidoId: otro.id },
    ],
  });
  // Partido 2: otro faltó.
  await prisma.partido.create({
    data: { ...base, participaciones: { create: [{ usuarioId: jugador.id, estado: 'VOY', asistio: true }, { usuarioId: otro.id, estado: 'VOY', asistio: false }] } },
  });
  // Uno sin jugar no cuenta.
  await prisma.partido.create({ data: { ...base, estado: 'ARMANDOSE', participaciones: { create: [{ usuarioId: otro.id, estado: 'VOY' }] } } });

  const tabla = await tablaDelGrupo(grupo.id);
  assert.equal(tabla.partidos, 2);
  assert.deepEqual(
    tabla.filas.map((f) => [f.id, f.jugados, f.asistencia, f.figuras]),
    [
      [jugador.id, 2, 100, 0],
      [otro.id, 1, 50, 1],
    ]
  );
  assert.equal(await jugaronJuntos(jugador.id, otro.id), 1);
  assert.equal(await jugaronJuntos(jugador.id, dueno.id), 0);
});

test('"Otra vez": el próximo día igual que se puede reservar', () => {
  // Viernes 16 de octubre de 2026, 12:00 en Argentina.
  const ahora = new Date('2026-10-16T15:00:00Z');
  assert.equal(proximoIgual('2026-10-09', '21:00', ahora), '2026-10-16', 'hoy todavía se llega');
  assert.equal(proximoIgual('2026-10-09', '10:00', ahora), '2026-10-23', 'hoy ya pasó: la semana que viene');
  assert.equal(proximoIgual('2026-10-14', '20:00', ahora), '2026-10-21');
});
