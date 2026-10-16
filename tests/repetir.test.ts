import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { repetirSemanales, siguienteFecha } from '../src/lib/repetir';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('siguiente fecha de la serie: misma hora, la primera semana que no pasó', () => {
  const fecha = new Date('2026-10-01T23:00:00Z');
  assert.equal(siguienteFecha(fecha, new Date('2026-10-02T12:00:00Z')).toISOString(), '2026-10-08T23:00:00.000Z');
  assert.equal(siguienteFecha(fecha, new Date('2026-10-09T12:00:00Z')).toISOString(), '2026-10-15T23:00:00.000Z');
});

test('partido semanal: al terminar se arma el de la semana siguiente, una sola vez', async () => {
  const sufijo = `rep${Date.now()}`;
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
  const ahora = new Date();
  const anterior = await prisma.partido.create({
    data: {
      deporteId: deporte.id,
      grupoId: grupo.id,
      organizadorId: jugador.id,
      fecha: new Date(ahora.getTime() - 3 * 3600_000),
      duracionMin: 60,
      recurrenteSemanal: true,
      lugarNombre: 'Club Norte',
      cupo: 10,
      costoPorJugador: 3000,
      participaciones: { create: [{ usuarioId: jugador.id, estado: 'VOY' }, { usuarioId: dueno.id, estado: 'VOY' }] },
    },
  });
  // Uno que todavía se está jugando: no se repite aún.
  const enJuego = await prisma.partido.create({
    data: { deporteId: deporte.id, organizadorId: jugador.id, fecha: new Date(ahora.getTime() - 30 * 60_000), duracionMin: 90, recurrenteSemanal: true, lugarNombre: 'Club', cupo: 10 },
  });

  await repetirSemanales(ahora);
  const nuevo = await prisma.partido.findUnique({
    where: { repetidoDeId: anterior.id },
    include: { participaciones: true },
  });
  assert.ok(nuevo);
  assert.equal(nuevo.fecha.getTime(), anterior.fecha.getTime() + 7 * 86400_000);
  assert.equal(nuevo.lugarNombre, 'Club Norte');
  assert.equal(nuevo.costoPorJugador, 3000);
  assert.equal(nuevo.grupoId, grupo.id);
  assert.ok(nuevo.recurrenteSemanal);
  assert.deepEqual(nuevo.participaciones.map((p) => [p.usuarioId, p.estado]), [[jugador.id, 'VOY']]);
  assert.equal(await prisma.partido.count({ where: { repetidoDeId: enJuego.id } }), 0);

  // Invitados: el grupo y los que jugaron (no el organizador).
  const invitaciones = await prisma.notificacion.findMany({ where: { url: `/partidos/${nuevo.id}`, tipo: 'INVITACION' } });
  assert.deepEqual(invitaciones.map((n) => n.usuarioId).sort(), [otro.id, dueno.id].sort());
  assert.equal(await prisma.notificacion.count({ where: { usuarioId: jugador.id, tipo: 'PARTIDO_REPETIDO' } }), 1);

  // Otra corrida no lo duplica.
  await repetirSemanales(new Date(ahora.getTime() + 60_000));
  assert.equal(await prisma.partido.count({ where: { repetidoDeId: anterior.id } }), 1);
});
