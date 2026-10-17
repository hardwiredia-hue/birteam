import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { pedirFijo, responderPedidoFijo, retirarPedidoFijo } from '../src/lib/pedidos-fijo';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('pedir turno fijo: el jugador pide, el complejo acepta o rechaza', async () => {
  const { cancha, dueno, jugador, otro } = await escenario(`pf${Date.now()}`);

  assert.equal(await pedirFijo(jugador, cancha.id, { diaSemana: 2, hora: '07:00' }), 'Ese horario no es un turno de la cancha.');
  assert.equal(await pedirFijo(dueno, cancha.id, { diaSemana: 2, hora: '21:00' }), 'Es tu cancha: el turno fijo lo armás desde la grilla.');
  assert.equal(await pedirFijo(jugador, cancha.id, { diaSemana: 2, hora: '21:00', nota: 'Somos 10' }), null);
  assert.match((await pedirFijo(jugador, cancha.id, { diaSemana: 3, hora: '21:00' })) ?? '', /esperando respuesta/, 'uno pendiente por cancha');
  assert.equal(await prisma.notificacion.count({ where: { usuarioId: dueno.id, tipo: 'PEDIDO_FIJO' } }), 1, 'avisa al complejo');

  const pedido = await prisma.pedidoFijo.findFirstOrThrow({ where: { usuarioId: jugador.id } });
  assert.equal(await responderPedidoFijo(otro.id, pedido.id, true), 'Lo responde el complejo.');
  assert.equal(await responderPedidoFijo(dueno.id, pedido.id, true), null);
  const fijo = await prisma.turnoFijo.findFirstOrThrow({ where: { canchaId: cancha.id, usuarioId: jugador.id } });
  assert.deepEqual([fijo.diaSemana, fijo.hora, fijo.titular], [2, '21:00', jugador.nombre]);
  assert.equal((await prisma.pedidoFijo.findUniqueOrThrow({ where: { id: pedido.id } })).estado, 'ACEPTADO');
  assert.equal(await responderPedidoFijo(dueno.id, pedido.id, true), 'Ese pedido ya no está pendiente.');

  // Ese horario ya es fijo: otro no lo puede pedir. Otro horario sí, y se puede rechazar o retirar.
  assert.match((await pedirFijo(otro, cancha.id, { diaSemana: 2, hora: '21:00' })) ?? '', /ya es turno fijo/);
  assert.equal(await pedirFijo(otro, cancha.id, { diaSemana: 4, hora: '20:00' }), null);
  const segundo = await prisma.pedidoFijo.findFirstOrThrow({ where: { usuarioId: otro.id, estado: 'PENDIENTE' } });
  assert.equal(await responderPedidoFijo(dueno.id, segundo.id, false), null);
  assert.equal(await prisma.notificacion.count({ where: { usuarioId: otro.id, tipo: 'PEDIDO_FIJO' } }), 1, 'le avisa que no');
  assert.equal(await pedirFijo(otro, cancha.id, { diaSemana: 5, hora: '20:00' }), null);
  const tercero = await prisma.pedidoFijo.findFirstOrThrow({ where: { usuarioId: otro.id, estado: 'PENDIENTE' } });
  assert.equal(await retirarPedidoFijo(jugador.id, tercero.id), 'Ese pedido ya no está pendiente.', 'solo lo retira quien lo pidió');
  assert.equal(await retirarPedidoFijo(otro.id, tercero.id), null);
});
