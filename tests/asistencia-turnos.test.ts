import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { historialDeTurnos, rotuloHistorial } from '../src/lib/reservas';
import { escenario, turno } from './ayuda';

after(() => prisma.$disconnect());

test('historial de turnos: cuenta los jugados y las faltas marcadas, en todas las canchas', async () => {
  const { jugador, otro, cancha } = await escenario('historial');
  const crear = (dias: number, hora: string, datos: { estado?: string; noVino?: boolean; usuarioId?: string } = {}) => {
    const { fecha, inicio } = turno(dias, hora);
    return prisma.reserva.create({
      data: {
        canchaId: cancha.id,
        usuarioId: datos.usuarioId ?? jugador.id,
        fecha,
        hora,
        inicio,
        estado: datos.estado ?? 'CONFIRMADA',
        noVino: datos.noVino ?? false,
      },
    });
  };
  await crear(-3, '20:00');
  await crear(-2, '20:00');
  await crear(-1, '20:00', { noVino: true });
  await crear(-1, '21:00', { estado: 'CANCELADA' }); // cancelado: no cuenta
  await crear(2, '20:00'); // todavía no se jugó: no cuenta

  const historial = await historialDeTurnos([jugador.id, otro.id]);
  assert.deepEqual(historial.get(jugador.id), { jugados: 2, faltas: 1 });
  assert.equal(historial.get(otro.id), undefined);

  assert.equal(rotuloHistorial(historial.get(jugador.id)), '1 falta en 3 turnos');
  assert.equal(rotuloHistorial(undefined), 'Primer turno en birteam');
  assert.equal(rotuloHistorial({ jugados: 1, faltas: 0 }), '1 turno jugado · sin faltas');
});
