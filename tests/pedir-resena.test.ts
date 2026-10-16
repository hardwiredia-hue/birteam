import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { pedirResenas } from '../src/lib/resenas';
import { claveOcupa } from '../src/lib/reservas';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('pedir reseña: una vez por cancha, después de jugar y si no la reseñó', async () => {
  const { cancha, jugador, otro, dueno } = await escenario(`res${Date.now()}`);
  const ahora = new Date();
  let n = 0;
  async function turno(usuarioId: string, horasAtras: number, extra: { noVino?: boolean } = {}) {
    n++;
    const inicio = new Date(ahora.getTime() - horasAtras * 3600_000);
    const fecha = inicio.toISOString().slice(0, 10);
    const hora = `0${n}:00`;
    await prisma.reserva.create({
      data: { canchaId: cancha.id, usuarioId, fecha, hora, inicio, duracion: 60, estado: 'CONFIRMADA', noVino: extra.noVino ?? false, ocupa: claveOcupa(cancha.id, fecha, hora) },
    });
  }
  await turno(jugador.id, 3); // terminó hace 2 h: se pide
  await turno(otro.id, 3, { noVino: true }); // no vino: no
  await turno(dueno.id, 3); // el dueño: no
  await turno(otro.id, 40); // hace mucho: no

  assert.equal(await pedirResenas(ahora), 1);
  const avisos = await prisma.notificacion.findMany({ where: { tipo: 'PEDIR_RESENA', url: `/canchas/${cancha.id}#resenas` } });
  assert.deepEqual(avisos.map((a) => a.usuarioId), [jugador.id]);
  // Otra corrida no lo repite.
  assert.equal(await pedirResenas(new Date(ahora.getTime() + 10 * 60_000)), 0);

  // Quien ya reseñó no recibe el pedido.
  await prisma.resenaCancha.create({ data: { canchaId: cancha.id, usuarioId: otro.id, puntaje: 5 } });
  await turno(otro.id, 2.5);
  assert.equal(await pedirResenas(ahora), 0);
});
