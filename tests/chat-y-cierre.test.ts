import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { avisarMensajeDeChat, marcarChatLeido, urlChatPartido } from '../src/lib/avisos-chat';
import { abrirDia, cerrarDia, diasCerrados } from '../src/lib/cerrar-dia';
import { claveOcupa, horariosDelDia } from '../src/lib/reservas';
import { escenario, turno } from './ayuda';

after(() => prisma.$disconnect());

test('charla del partido: un aviso por charla hasta que se lee', async () => {
  const sufijo = `chat${Date.now()}`;
  const { deporte, jugador, otro, dueno } = await escenario(sufijo);
  const partido = await prisma.partido.create({
    data: {
      deporteId: deporte.id,
      organizadorId: jugador.id,
      fecha: new Date(Date.now() + 86400_000),
      lugarNombre: 'Club',
      cupo: 10,
      participaciones: {
        create: [
          { usuarioId: jugador.id, estado: 'VOY' },
          { usuarioId: otro.id, estado: 'TALVEZ' },
          { usuarioId: dueno.id, estado: 'NOVOY' },
        ],
      },
    },
  });
  const url = urlChatPartido(partido.id);

  const primero = await avisarMensajeDeChat(jugador, { partidoId: partido.id }, '¿Quién lleva la pelota?');
  assert.deepEqual(primero, { nuevos: 1, actualizados: 0 }, 'avisa a "tal vez", no al autor ni a "no voy"');
  const segundo = await avisarMensajeDeChat(jugador, { partidoId: partido.id }, 'Llevo pecheras');
  assert.deepEqual(segundo, { nuevos: 0, actualizados: 1 }, 'el segundo actualiza el mismo aviso');
  const avisos = await prisma.notificacion.findMany({ where: { usuarioId: otro.id, url } });
  assert.equal(avisos.length, 1);
  assert.match(avisos[0].cuerpo ?? '', /Llevo pecheras/);

  await marcarChatLeido(otro.id, { partidoId: partido.id });
  assert.deepEqual(await avisarMensajeDeChat(jugador, { partidoId: partido.id }, 'Nos vemos'), { nuevos: 1, actualizados: 0 });

  // El que apagó los avisos de charlas no recibe nada.
  await prisma.usuario.update({ where: { id: otro.id }, data: { avisosChats: false } });
  await marcarChatLeido(otro.id, { partidoId: partido.id });
  assert.deepEqual(await avisarMensajeDeChat(jugador, { partidoId: partido.id }, 'Último'), { nuevos: 0, actualizados: 0 });
});

test('cerrar el día: bloquea los libres, no toca lo reservado y se puede abrir', async () => {
  const { cancha, jugador, dueno } = await escenario(`cierre${Date.now()}`);
  const { fecha, inicio } = turno(3, '20:00');
  const reserva = await prisma.reserva.create({
    data: { canchaId: cancha.id, usuarioId: jugador.id, fecha, hora: '20:00', inicio, estado: 'CONFIRMADA', ocupa: claveOcupa(cancha.id, fecha, '20:00') },
  });
  const manual = turno(3, '10:00');
  await prisma.reserva.create({
    data: { canchaId: cancha.id, usuarioId: dueno.id, fecha, hora: '10:00', inicio: manual.inicio, estado: 'BLOQUEO', nota: 'Pintura', ocupa: claveOcupa(cancha.id, fecha, '10:00') },
  });
  // Un turno fijo de alguien sin cuenta: se guarda como bloqueo, pero es de un cliente.
  const fijo = await prisma.turnoFijo.create({
    data: { canchaId: cancha.id, diaSemana: new Date(`${fecha}T12:00:00-03:00`).getDay(), hora: '18:00', titular: 'Los del jueves', desde: fecha, creadoPorId: dueno.id },
  });
  const delFijo = turno(3, '18:00');
  await prisma.reserva.create({
    data: { canchaId: cancha.id, usuarioId: dueno.id, fecha, hora: '18:00', inicio: delFijo.inicio, estado: 'BLOQUEO', turnoFijoId: fijo.id, ocupa: claveOcupa(cancha.id, fecha, '18:00') },
  });
  const horas = horariosDelDia(cancha).length;

  const resultado = await cerrarDia({ canchas: [cancha], fecha, motivo: 'Feriado', usuarioId: dueno.id });
  assert.equal(resultado.bloqueados, horas - 3);
  assert.deepEqual(resultado.reservadas.map((r) => [r.hora, r.quien]), [['18:00', 'Los del jueves'], ['20:00', jugador.nombre]]);
  assert.equal(resultado.reservadas[1].id, reserva.id);
  assert.deepEqual(await diasCerrados(cancha.id), [{ fecha, motivo: 'Feriado' }]);
  // Dos veces no duplica.
  assert.equal((await cerrarDia({ canchas: [cancha], fecha, motivo: 'Feriado', usuarioId: dueno.id })).bloqueados, 0);

  assert.equal(await abrirDia([cancha.id], fecha), horas - 3);
  const activas = await prisma.reserva.findMany({ where: { canchaId: cancha.id, fecha, estado: { not: 'CANCELADA' } } });
  assert.deepEqual(activas.map((r) => r.hora).sort(), ['10:00', '18:00', '20:00'], 'quedan la reserva, el fijo y el bloqueo a mano');
  assert.deepEqual(await diasCerrados(cancha.id), []);
});
