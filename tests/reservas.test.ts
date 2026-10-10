import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { claveOcupa, liberarVencidas } from '../src/lib/reservas';
import { escenario, turno } from './ayuda';

after(() => prisma.$disconnect());

test('dos pedidos simultáneos del mismo turno: entra uno solo', async () => {
  const { cancha, jugador, otro } = await escenario('concurrencia');
  const { fecha, hora, inicio } = turno(2, '20:00');
  const intentos = Array.from({ length: 12 }, (_, i) =>
    prisma.reserva.create({
      data: {
        canchaId: cancha.id,
        usuarioId: i % 2 ? jugador.id : otro.id,
        fecha,
        hora,
        inicio,
        estado: 'SOLICITADA',
        ocupa: claveOcupa(cancha.id, fecha, hora),
      },
    })
  );
  const resultados = await Promise.allSettled(intentos);
  assert.equal(resultados.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    await prisma.reserva.count({ where: { canchaId: cancha.id, fecha, hora, ocupa: { not: null } } }),
    1
  );
});

test('un turno liberado (ocupa nulo) se puede volver a tomar', async () => {
  const { cancha, jugador, otro } = await escenario('liberado');
  const { fecha, hora, inicio } = turno(2, '19:00');
  const primera = await prisma.reserva.create({
    data: { canchaId: cancha.id, usuarioId: jugador.id, fecha, hora, inicio, ocupa: claveOcupa(cancha.id, fecha, hora) },
  });
  await prisma.reserva.update({ where: { id: primera.id }, data: { estado: 'CANCELADA', ocupa: null } });
  const segunda = await prisma.reserva.create({
    data: { canchaId: cancha.id, usuarioId: otro.id, fecha, hora, inicio, ocupa: claveOcupa(cancha.id, fecha, hora) },
  });
  assert.equal(segunda.estado, 'SOLICITADA');
});

test('pedidos sin respuesta y pagos sin completar vencen y liberan el turno', async () => {
  const { cancha, jugador } = await escenario('vencidas');
  const a = turno(3, '18:00');
  const b = turno(3, '21:00');
  const pasado = new Date(Date.now() - 1000);
  const solicitada = await prisma.reserva.create({
    data: { canchaId: cancha.id, usuarioId: jugador.id, ...a, estado: 'SOLICITADA', venceEn: pasado, ocupa: claveOcupa(cancha.id, a.fecha, a.hora) },
  });
  const sinPagar = await prisma.reserva.create({
    data: { canchaId: cancha.id, usuarioId: jugador.id, ...b, estado: 'PENDIENTE_PAGO', venceEn: pasado, montoOnline: 9000, ocupa: claveOcupa(cancha.id, b.fecha, b.hora) },
  });
  await liberarVencidas(cancha.id);
  for (const id of [solicitada.id, sinPagar.id]) {
    const reserva = await prisma.reserva.findUniqueOrThrow({ where: { id } });
    assert.equal(reserva.estado, 'VENCIDA');
    assert.equal(reserva.ocupa, null);
  }
  assert.ok((await prisma.notificacion.count({ where: { usuarioId: jugador.id, tipo: 'RESERVA_VENCIDA' } })) >= 2);
});
