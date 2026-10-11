import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/db';
import { claveOcupa, diaDeSemana } from '../src/lib/reservas';
import { fechasDelFijo, materializarFijos, terminarFijo } from '../src/lib/turnos-fijos';
import { escenario, turno } from './ayuda';

after(() => prisma.$disconnect());

/** Un turno fijo a las 21 h el día de la semana que cae dentro de `dias` días. */
async function crearFijo(canchaId: string, creadoPorId: string, usuarioId: string | null, dias = 3) {
  const { fecha } = turno(dias, '21:00');
  return prisma.turnoFijo.create({
    data: {
      canchaId,
      diaSemana: diaDeSemana(fecha),
      hora: '21:00',
      titular: 'Los Pibes',
      usuarioId,
      desde: turno(0, '21:00').fecha,
      creadoPorId,
    },
  });
}

test('turno fijo: genera las semanas reservables una sola vez, a nombre del jugador', async () => {
  const { dueno, jugador, cancha } = await escenario('fijo1');
  const fijo = await crearFijo(cancha.id, dueno.id, jugador.id);

  const esperadas = fechasDelFijo(fijo, cancha);
  assert.equal(esperadas.length, 2, 'en 14 días entran dos semanas');

  assert.equal(await materializarFijos(cancha.id), 2);
  assert.equal(await materializarFijos(cancha.id), 0, 'idempotente');

  const semanas = await prisma.reserva.findMany({ where: { turnoFijoId: fijo.id }, orderBy: { fecha: 'asc' } });
  assert.deepEqual(semanas.map((s) => s.fecha), esperadas);
  for (const semana of semanas) {
    assert.equal(semana.estado, 'CONFIRMADA');
    assert.equal(semana.usuarioId, jugador.id);
    assert.equal(semana.ocupa, claveOcupa(cancha.id, semana.fecha, '21:00'));
    assert.equal(semana.precio, 30000);
  }

  // Nadie más puede tomar ese turno: choca con la clave única.
  await assert.rejects(
    prisma.reserva.create({
      data: {
        canchaId: cancha.id,
        usuarioId: dueno.id,
        fecha: semanas[0].fecha,
        hora: '21:00',
        inicio: semanas[0].inicio,
        estado: 'SOLICITADA',
        ocupa: claveOcupa(cancha.id, semanas[0].fecha, '21:00'),
      },
    }),
    (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  );
});

test('turno fijo: una semana cancelada no vuelve a generarse', async () => {
  const { dueno, cancha } = await escenario('fijo2');
  const fijo = await crearFijo(cancha.id, dueno.id, null);
  await materializarFijos(cancha.id);

  const [primera] = await prisma.reserva.findMany({ where: { turnoFijoId: fijo.id }, orderBy: { fecha: 'asc' } });
  assert.equal(primera.estado, 'BLOQUEO', 'sin jugador, es un bloqueo del complejo');
  assert.equal(primera.nota, 'Turno fijo · Los Pibes');
  await prisma.reserva.update({ where: { id: primera.id }, data: { estado: 'CANCELADA', ocupa: null } });

  assert.equal(await materializarFijos(cancha.id), 0);
  const otra = await prisma.reserva.findFirst({
    where: { turnoFijoId: fijo.id, fecha: primera.fecha, estado: { not: 'CANCELADA' } },
  });
  assert.equal(otra, null);
});

test('turno fijo: si una semana ya estaba tomada, no la pisa y avisa una sola vez', async () => {
  const { dueno, jugador, otro, cancha } = await escenario('fijo3');
  const { fecha, inicio } = turno(3, '21:00');
  const ajena = await prisma.reserva.create({
    data: {
      canchaId: cancha.id,
      usuarioId: otro.id,
      fecha,
      hora: '21:00',
      inicio,
      estado: 'CONFIRMADA',
      ocupa: claveOcupa(cancha.id, fecha, '21:00'),
    },
  });
  const fijo = await crearFijo(cancha.id, dueno.id, jugador.id);
  await materializarFijos(cancha.id);
  await materializarFijos(cancha.id);

  const constancia = await prisma.reserva.findFirst({ where: { turnoFijoId: fijo.id, fecha } });
  assert.equal(constancia?.estado, 'CANCELADA');
  assert.equal(constancia?.ocupa, null);
  assert.equal((await prisma.reserva.findUnique({ where: { id: ajena.id } }))?.estado, 'CONFIRMADA');

  const avisos = await prisma.notificacion.count({ where: { usuarioId: dueno.id, tipo: 'TURNO_FIJO_CHOCA' } });
  assert.equal(avisos, 1);
  // La otra semana sí quedó tomada.
  assert.equal(await prisma.reserva.count({ where: { turnoFijoId: fijo.id, estado: 'CONFIRMADA' } }), 1);
});

test('turno fijo: al terminarlo se liberan las semanas que vienen y no se generan más', async () => {
  const { dueno, jugador, cancha } = await escenario('fijo4');
  const fijo = await crearFijo(cancha.id, dueno.id, jugador.id);
  await materializarFijos(cancha.id);

  assert.equal(await terminarFijo(fijo.id, 'COMPLEJO'), true);
  assert.equal(await terminarFijo(fijo.id, 'COMPLEJO'), false, 'no se termina dos veces');

  const semanas = await prisma.reserva.findMany({ where: { turnoFijoId: fijo.id } });
  assert.ok(semanas.every((s) => s.estado === 'CANCELADA' && s.ocupa === null));
  assert.equal(await materializarFijos(cancha.id), 0);
  assert.equal(
    await prisma.notificacion.count({ where: { usuarioId: jugador.id, tipo: 'TURNO_FIJO_TERMINADO' } }),
    1
  );
});

test('turno fijo: si la cancha deja de abrir ese día, esa semana no existe', async () => {
  const { dueno, cancha } = await escenario('fijo5');
  const fijo = await crearFijo(cancha.id, dueno.id, null);
  const sinEseDia = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== fijo.diaSemana);
  assert.deepEqual(fechasDelFijo(fijo, { ...cancha, diasDisponibles: JSON.stringify(sinEseDia) }), []);
  assert.deepEqual(fechasDelFijo(fijo, { ...cancha, horaCierre: 21 }), [], 'el horario ya no es un turno');
});
