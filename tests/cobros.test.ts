import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { procesarPago, reembolsarReserva } from '../src/lib/cobros';
import { crearPagoSimulado } from '../src/lib/mercadopago';
import { claveOcupa } from '../src/lib/reservas';
import { escenario, turno } from './ayuda';

// El circuito se prueba con el simulador: mismo procesamiento que un pago real.
before(async () => {
  await prisma.ajuste.upsert({
    where: { clave: 'pagos_simulados' },
    create: { clave: 'pagos_simulados', valor: '1' },
    update: { valor: '1' },
  });
});
after(() => prisma.$disconnect());

async function preparar(sufijo: string, hora = '20:00') {
  const datos = await escenario(sufijo);
  await prisma.cuentaMercadoPago.create({
    data: { usuarioId: datos.dueno.id, mpUserId: 'simulado', accessToken: 'SIMULADO', expiraEn: new Date(Date.now() + 86400_000), simulada: true },
  });
  const t = turno(2, hora);
  const reserva = await prisma.reserva.create({
    data: {
      canchaId: datos.cancha.id,
      usuarioId: datos.jugador.id,
      ...t,
      estado: 'PENDIENTE_PAGO',
      precio: 30000,
      montoOnline: 9000,
      pagoEstado: 'PENDIENTE',
      venceEn: new Date(Date.now() + 15 * 60_000),
      ocupa: claveOcupa(datos.cancha.id, t.fecha, t.hora),
    },
  });
  return { ...datos, reserva, t };
}

test('pago aprobado confirma la reserva una sola vez', async () => {
  const { reserva, dueno } = await preparar('aprobado');
  const pago = await crearPagoSimulado(reserva.id, 9000, 0, true);
  assert.equal((await procesarPago(reserva.id, pago)).resultado, 'CONFIRMADA');
  assert.equal((await procesarPago(reserva.id, pago)).resultado, 'YA_CONFIRMADA');
  const final = await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.id }, include: { pagos: true } });
  assert.equal(final.estado, 'CONFIRMADA');
  assert.equal(final.pagoEstado, 'APROBADO');
  assert.equal(final.pagos.length, 1);
  assert.equal(await prisma.notificacion.count({ where: { usuarioId: dueno.id, tipo: 'RESERVA_PAGADA' } }), 1);
});

test('pago rechazado no confirma y el turno sigue retenido', async () => {
  const { reserva } = await preparar('rechazado');
  const pago = await crearPagoSimulado(reserva.id, 9000, 0, false);
  assert.equal((await procesarPago(reserva.id, pago)).resultado, 'NO_APROBADO');
  const final = await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.id } });
  assert.equal(final.estado, 'PENDIENTE_PAGO');
  assert.ok(final.ocupa);
});

test('pago de otra reserva no confirma esta', async () => {
  const { reserva } = await preparar('ajeno');
  const { reserva: otra } = await preparar('ajeno-2', '21:00');
  const pago = await crearPagoSimulado(otra.id, 9000, 0, true);
  assert.equal((await procesarPago(reserva.id, pago)).resultado, 'AJENO');
  assert.equal((await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.id } })).estado, 'PENDIENTE_PAGO');
});

test('monto menor al del turno: se devuelve y no se confirma', async () => {
  const { reserva } = await preparar('monto');
  const pago = await crearPagoSimulado(reserva.id, 100, 0, true);
  assert.equal((await procesarPago(reserva.id, pago)).resultado, 'MONTO_INCORRECTO');
  assert.equal((await prisma.pagoSimulado.findUniqueOrThrow({ where: { id: pago } })).estado, 'refunded');
  assert.equal((await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.id } })).estado, 'PENDIENTE_PAGO');
});

test('pago tardío: confirma si el turno sigue libre, devuelve si ya lo tomó otro', async () => {
  const libre = await preparar('tardio-libre');
  await prisma.reserva.update({ where: { id: libre.reserva.id }, data: { estado: 'VENCIDA', ocupa: null } });
  const pagoLibre = await crearPagoSimulado(libre.reserva.id, 9000, 0, true);
  assert.equal((await procesarPago(libre.reserva.id, pagoLibre)).resultado, 'CONFIRMADA');

  const tomado = await preparar('tardio-tomado');
  await prisma.reserva.update({ where: { id: tomado.reserva.id }, data: { estado: 'VENCIDA', ocupa: null } });
  await prisma.reserva.create({
    data: {
      canchaId: tomado.cancha.id,
      usuarioId: tomado.otro.id,
      ...tomado.t,
      ocupa: claveOcupa(tomado.cancha.id, tomado.t.fecha, tomado.t.hora),
    },
  });
  const pagoTomado = await crearPagoSimulado(tomado.reserva.id, 9000, 0, true);
  assert.equal((await procesarPago(tomado.reserva.id, pagoTomado)).resultado, 'DEVUELTO');
  assert.equal((await prisma.reserva.findUniqueOrThrow({ where: { id: tomado.reserva.id } })).pagoEstado, 'REEMBOLSADO');
});

test('pago que llega después de cancelar: se devuelve', async () => {
  const { reserva } = await preparar('cancelada');
  await prisma.reserva.update({ where: { id: reserva.id }, data: { estado: 'CANCELADA', ocupa: null } });
  const pago = await crearPagoSimulado(reserva.id, 9000, 0, true);
  assert.equal((await procesarPago(reserva.id, pago)).resultado, 'DEVUELTO');
});

test('cancelar una reserva pagada devuelve el pago una sola vez', async () => {
  const { reserva } = await preparar('reembolso');
  const pago = await crearPagoSimulado(reserva.id, 9000, 0, true);
  await procesarPago(reserva.id, pago);
  await reembolsarReserva(reserva.id, 'prueba');
  await reembolsarReserva(reserva.id, 'prueba'); // reintento: no devuelve dos veces
  const final = await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.id }, include: { pagos: true } });
  assert.equal(final.pagoEstado, 'REEMBOLSADO');
  assert.equal(final.pagos[0].estado, 'refunded');
  assert.ok(final.pagos[0].reembolsadoEn);
  assert.equal(await prisma.eventoPago.count({ where: { reservaId: reserva.id, tipo: 'REEMBOLSADO' } }), 1);
});
