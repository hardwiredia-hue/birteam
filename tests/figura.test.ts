import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { contarVotos, estadoVotacion, jugaron, vecesFigura } from '../src/lib/figura';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('figura: la votación abre al empezar el partido y cierra a las 72 h', () => {
  const ahora = new Date('2026-10-15T12:00:00Z');
  const hace = (horas: number) => new Date(ahora.getTime() - horas * 3600_000);
  assert.equal(estadoVotacion({ fecha: hace(-1), estado: 'CONFIRMADO' }, ahora), 'NO_EMPEZO');
  assert.equal(estadoVotacion({ fecha: hace(2), estado: 'JUGADO' }, ahora), 'ABIERTA');
  assert.equal(estadoVotacion({ fecha: hace(73), estado: 'JUGADO' }, ahora), 'CERRADA');
  assert.equal(estadoVotacion({ fecha: hace(2), estado: 'CANCELADO' }, ahora), 'NO_EMPEZO');
});

test('figura: gana el más votado y un empate comparte la figura', () => {
  assert.deepEqual(contarVotos([{ elegidoId: 'a' }, { elegidoId: 'b' }, { elegidoId: 'a' }]).ganadores, ['a']);
  assert.deepEqual(contarVotos([{ elegidoId: 'a' }, { elegidoId: 'b' }]).ganadores.sort(), ['a', 'b']);
  assert.deepEqual(contarVotos([]).ganadores, []);
  // Votan los que fueron: los ausentes y los que no confirmaron quedan afuera.
  const lista = [
    { id: 1, estado: 'VOY', asistio: true },
    { id: 2, estado: 'VOY', asistio: null },
    { id: 3, estado: 'VOY', asistio: false },
    { id: 4, estado: 'TALVEZ', asistio: null },
  ];
  assert.deepEqual(jugaron(lista).map((p) => p.id), [1, 2]);
});

test('figura: cuenta en el perfil solo con la votación cerrada y al menos 2 votos', async () => {
  const { deporte, dueno, jugador, otro } = await escenario('figura');
  const tercero = await prisma.usuario.create({ data: { nombre: 'Tercero', usuario: 'tercero-figura', email: 'tercero-figura@prueba.test' } });
  const partido = (dias: number) =>
    prisma.partido.create({
      data: {
        deporteId: deporte.id,
        organizadorId: dueno.id,
        fecha: new Date(Date.now() - dias * 86400_000),
        lugarNombre: 'Cancha',
        cupo: 10,
        estado: 'JUGADO',
      },
    });
  const viejo = await partido(5);
  const otroViejo = await partido(6);
  const reciente = await partido(1);
  // Viejo: 2 votos para el jugador → figura.
  await prisma.votoFigura.createMany({
    data: [
      { partidoId: viejo.id, votanteId: otro.id, elegidoId: jugador.id },
      { partidoId: viejo.id, votanteId: tercero.id, elegidoId: jugador.id },
      { partidoId: viejo.id, votanteId: jugador.id, elegidoId: otro.id },
    ],
  });
  // Otro viejo: un solo voto → no alcanza.
  await prisma.votoFigura.create({ data: { partidoId: otroViejo.id, votanteId: otro.id, elegidoId: jugador.id } });
  // Reciente: votación todavía abierta → no cuenta aún.
  await prisma.votoFigura.createMany({
    data: [
      { partidoId: reciente.id, votanteId: otro.id, elegidoId: jugador.id },
      { partidoId: reciente.id, votanteId: tercero.id, elegidoId: jugador.id },
    ],
  });
  assert.equal(await vecesFigura(jugador.id), 1);
  assert.equal(await vecesFigura(otro.id), 0);
});
