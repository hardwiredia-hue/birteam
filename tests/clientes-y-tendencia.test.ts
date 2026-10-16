import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { clientesDelComplejo, haceRatoQueNoViene } from '../src/lib/clientes';
import { porSemana } from '../src/lib/tendencia';
import { claveOcupa } from '../src/lib/reservas';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('tendencia: cuenta por semana, la última termina ahora', () => {
  const ahora = new Date('2026-10-16T12:00:00Z');
  const dia = 86400_000;
  const fechas = [1, 2, 8, 50, 60].map((d) => new Date(ahora.getTime() - d * dia));
  const semanas = porSemana(fechas, ahora, 8);
  assert.equal(semanas.length, 8);
  assert.deepEqual(semanas.map((s) => s.valor), [1, 0, 0, 0, 0, 0, 1, 2], 'la de hace 60 días queda afuera (8 semanas = 56 días)');
});

test('clientes del complejo: jugados, faltas, próximos y quién hace rato que no viene', async () => {
  const sufijo = `cli${Date.now()}`;
  const { cancha, dueno, jugador, otro } = await escenario(sufijo);
  const ahora = new Date();
  let n = 0;
  async function reserva(usuarioId: string, dias: number, extra: { estado?: string; noVino?: boolean } = {}) {
    n++;
    const inicio = new Date(ahora.getTime() + dias * 86400_000 + n * 60_000);
    const fecha = inicio.toISOString().slice(0, 10);
    const hora = `${String(n).padStart(2, '0')}:00`;
    return prisma.reserva.create({
      data: {
        canchaId: cancha.id, usuarioId, fecha, hora, inicio, precio: 30000,
        estado: extra.estado ?? 'CONFIRMADA', noVino: extra.noVino ?? false,
        ocupa: claveOcupa(cancha.id, fecha, hora),
      },
    });
  }
  // Jugador: 3 jugados (el último hace 40 días) y una falta.
  await reserva(jugador.id, -100);
  await reserva(jugador.id, -60);
  await reserva(jugador.id, -40);
  await reserva(jugador.id, -20, { noVino: true });
  // Otro: uno jugado y uno que viene.
  await reserva(otro.id, -3);
  await reserva(otro.id, 5);
  // Bloqueos del dueño y pedidos cancelados no cuentan.
  await reserva(dueno.id, -2, { estado: 'BLOQUEO' });
  await reserva(otro.id, -1, { estado: 'CANCELADA' });

  const clientes = await clientesDelComplejo(dueno.id, { ahora });
  assert.deepEqual(clientes.map((c) => c.id), [jugador.id, otro.id]);
  const [primero, segundo] = clientes;
  assert.equal(primero.jugados, 3);
  assert.equal(primero.faltas, 1);
  assert.equal(primero.gastado, 90000);
  assert.ok(haceRatoQueNoViene(primero, ahora));
  assert.equal(segundo.proximos, 1);
  assert.ok(!haceRatoQueNoViene(segundo, ahora));
  assert.deepEqual((await clientesDelComplejo(dueno.id, { q: 'otro', ahora })).map((c) => c.id), [otro.id]);
});
