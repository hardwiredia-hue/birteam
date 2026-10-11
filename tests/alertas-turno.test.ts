import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { claveOcupa } from '../src/lib/reservas';
import { avisarTurnoLibre } from '../src/lib/alertas-turno';
import { materializarFijos, terminarFijo } from '../src/lib/turnos-fijos';
import { diaDeSemana } from '../src/lib/reservas';
import { escenario, turno } from './ayuda';

after(() => prisma.$disconnect());

async function tomar(canchaId: string, usuarioId: string, dias: number, hora: string) {
  const { fecha, inicio } = turno(dias, hora);
  return prisma.reserva.create({
    data: { canchaId, usuarioId, fecha, hora, inicio, estado: 'CONFIRMADA', ocupa: claveOcupa(canchaId, fecha, hora) },
  });
}

test('avisame si se libera: avisa una sola vez y solo si de verdad quedó libre', async () => {
  const { jugador, otro, cancha } = await escenario('alerta1');
  const reserva = await tomar(cancha.id, otro.id, 2, '20:00');
  await prisma.alertaTurno.create({
    data: { canchaId: cancha.id, usuarioId: jugador.id, fecha: reserva.fecha, hora: '20:00' },
  });

  // Todavía está tomado: no se avisa.
  assert.equal(await avisarTurnoLibre(cancha.id, reserva.fecha, '20:00'), 0);

  await prisma.reserva.update({ where: { id: reserva.id }, data: { estado: 'CANCELADA', ocupa: null } });
  assert.equal(await avisarTurnoLibre(cancha.id, reserva.fecha, '20:00'), 1);
  assert.equal(await avisarTurnoLibre(cancha.id, reserva.fecha, '20:00'), 0, 'no avisa dos veces');

  const avisos = await prisma.notificacion.findMany({ where: { usuarioId: jugador.id, tipo: 'TURNO_LIBRE' } });
  assert.equal(avisos.length, 1);
  assert.match(avisos[0].url ?? '', new RegExp(`fecha=${reserva.fecha}&hora=20:00`));
});

test('avisame si se libera: no avisa por turnos que ya están por arrancar', async () => {
  const { jugador, cancha } = await escenario('alerta2');
  const { fecha } = turno(0, '00:00');
  await prisma.alertaTurno.create({ data: { canchaId: cancha.id, usuarioId: jugador.id, fecha, hora: '00:00' } });
  assert.equal(await avisarTurnoLibre(cancha.id, fecha, '00:00'), 0);
});

test('avisame si se libera: terminar un turno fijo avisa a quien esperaba esa semana', async () => {
  const { dueno, jugador, cancha } = await escenario('alerta3');
  const { fecha } = turno(3, '21:00');
  const fijo = await prisma.turnoFijo.create({
    data: {
      canchaId: cancha.id,
      diaSemana: diaDeSemana(fecha),
      hora: '21:00',
      titular: 'Los de siempre',
      desde: turno(0, '21:00').fecha,
      creadoPorId: dueno.id,
    },
  });
  await materializarFijos(cancha.id);
  await prisma.alertaTurno.create({ data: { canchaId: cancha.id, usuarioId: jugador.id, fecha, hora: '21:00' } });

  await terminarFijo(fijo.id, 'COMPLEJO');
  assert.equal(await prisma.notificacion.count({ where: { usuarioId: jugador.id, tipo: 'TURNO_LIBRE' } }), 1);
});
