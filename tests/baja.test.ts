import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { eliminarCuenta, impedimentoParaBaja } from '../src/lib/baja';
import { claveOcupa } from '../src/lib/reservas';
import { escenario, turno } from './ayuda';

after(() => prisma.$disconnect());

test('no se puede cerrar la cuenta con turnos reservados por delante', async () => {
  const { cancha, jugador } = await escenario('baja-turno');
  const t = turno(2, '20:00');
  await prisma.reserva.create({
    data: { canchaId: cancha.id, usuarioId: jugador.id, ...t, ocupa: claveOcupa(cancha.id, t.fecha, t.hora) },
  });
  assert.match((await impedimentoParaBaja(jugador.id)) ?? '', /turno/);
});

test('la baja borra datos personales y contenido, y pasa el grupo y el partido', async () => {
  const { deporte, jugador, otro } = await escenario('baja');
  await prisma.usuario.update({ where: { id: jugador.id }, data: { telefono: '223555', bio: 'hola', ciudad: 'MDQ' } });
  await prisma.jugada.create({ data: { autorId: jugador.id, texto: 'golazo' } });
  await prisma.seguimiento.create({ data: { seguidorId: otro.id, seguidoId: jugador.id } });
  const grupo = await prisma.grupo.create({
    data: {
      nombre: 'Grupo baja',
      slug: 'grupo-baja-test',
      deporteId: deporte.id,
      creadorId: jugador.id,
      miembros: { create: [{ usuarioId: jugador.id, rol: 'ADMIN' }, { usuarioId: otro.id }] },
    },
  });
  const partido = await prisma.partido.create({
    data: {
      deporteId: deporte.id,
      organizadorId: jugador.id,
      fecha: new Date(Date.now() + 3 * 86400_000),
      lugarNombre: 'Club',
      cupo: 10,
      minimo: 8,
      participaciones: { create: [{ usuarioId: jugador.id, estado: 'VOY' }, { usuarioId: otro.id, estado: 'VOY' }] },
    },
  });

  assert.equal(await impedimentoParaBaja(jugador.id), null);
  await eliminarCuenta(jugador.id);

  const final = await prisma.usuario.findUniqueOrThrow({ where: { id: jugador.id } });
  assert.equal(final.nombre, 'Usuario eliminado');
  assert.ok(final.eliminadoEn);
  assert.equal(final.hashClave, null);
  assert.equal(final.telefono, null);
  assert.equal(final.bio, null);
  assert.ok(final.email.endsWith('@birteam.invalid'));
  assert.equal(await prisma.jugada.count({ where: { autorId: jugador.id } }), 0);
  assert.equal(await prisma.seguimiento.count({ where: { seguidoId: jugador.id } }), 0);
  const admin = await prisma.miembroGrupo.findFirstOrThrow({ where: { grupoId: grupo.id } });
  assert.equal(admin.usuarioId, otro.id);
  assert.equal(admin.rol, 'ADMIN');
  assert.equal((await prisma.partido.findUniqueOrThrow({ where: { id: partido.id } })).estado, 'CANCELADO');
  assert.equal(await prisma.notificacion.count({ where: { usuarioId: otro.id, tipo: 'PARTIDO_CANCELADO' } }), 1);
});
