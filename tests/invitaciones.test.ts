import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { invitarAPartido, partidosParaInvitar } from '../src/lib/invitaciones';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('invitar a un partido: quién puede y a qué partidos', async () => {
  const sufijo = `inv${Date.now()}`;
  const { deporte, jugador, otro, dueno } = await escenario(sufijo);
  const base = { deporteId: deporte.id, fecha: new Date(Date.now() + 86400_000), lugarNombre: 'Club', cupo: 10 };
  const mio = await prisma.partido.create({
    data: { ...base, organizadorId: jugador.id, participaciones: { create: { usuarioId: jugador.id, estado: 'VOY' } } },
  });
  const cerrado = await prisma.partido.create({ data: { ...base, organizadorId: jugador.id, listaCerrada: true } });
  // Un partido ajeno y privado donde estoy: no puedo invitar.
  const ajenoPrivado = await prisma.partido.create({
    data: { ...base, organizadorId: dueno.id, visibilidad: 'GRUPO', participaciones: { create: { usuarioId: jugador.id, estado: 'VOY' } } },
  });
  // Uno ajeno y abierto donde estoy confirmado: sí.
  const ajenoAbierto = await prisma.partido.create({
    data: { ...base, organizadorId: dueno.id, visibilidad: 'ABIERTO', participaciones: { create: { usuarioId: jugador.id, estado: 'VOY' } } },
  });

  const ids = (await partidosParaInvitar(jugador.id, otro.id)).map((p) => p.id);
  assert.ok(ids.includes(mio.id));
  assert.ok(ids.includes(ajenoAbierto.id));
  assert.ok(!ids.includes(cerrado.id), 'lista cerrada');
  assert.ok(!ids.includes(ajenoPrivado.id), 'privado ajeno');

  assert.equal(await invitarAPartido(jugador, mio.id, otro.id), null);
  assert.equal(await invitarAPartido(jugador, mio.id, otro.id), 'Ya lo invitaste a este partido.');
  assert.ok(await invitarAPartido(jugador, cerrado.id, otro.id));

  // Ya anotado: no aparece.
  await prisma.participacion.create({ data: { partidoId: ajenoAbierto.id, usuarioId: otro.id, estado: 'TALVEZ' } });
  assert.ok(!(await partidosParaInvitar(jugador.id, otro.id).then((l) => l.map((p) => p.id))).includes(ajenoAbierto.id));

  // Bloqueo en cualquier sentido: nada.
  await prisma.bloqueo.create({ data: { bloqueadorId: otro.id, bloqueadoId: jugador.id } });
  assert.deepEqual(await partidosParaInvitar(jugador.id, otro.id), []);
});
