import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { agendaDelDia, enlaceWhatsApp } from '../src/lib/agenda';
import { escenario, turno } from './ayuda';

after(() => prisma.$disconnect());

test('agenda: los turnos del día por hora, con estado y plata', async () => {
  const sufijo = `age${Date.now()}`;
  const { cancha, dueno, jugador } = await escenario(sufijo);
  await prisma.usuario.update({ where: { id: jugador.id }, data: { telefono: '0341 15 555-1234' } });
  const t1 = turno(1, '19:00');
  const t2 = turno(1, '18:00');
  const t3 = turno(1, '21:00');
  const base = { canchaId: cancha.id, fecha: t1.fecha, precio: 30000 };
  await prisma.reserva.create({ data: { ...base, usuarioId: jugador.id, hora: '19:00', inicio: t1.inicio, estado: 'CONFIRMADA', montoOnline: 9000, pagoEstado: 'APROBADO' } });
  await prisma.reserva.create({ data: { ...base, usuarioId: dueno.id, hora: '18:00', inicio: t2.inicio, estado: 'BLOQUEO', nota: 'Mantenimiento', precio: null } });
  await prisma.reserva.create({ data: { ...base, usuarioId: jugador.id, hora: '21:00', inicio: t3.inicio, estado: 'CANCELADA' } });

  const agenda = await agendaDelDia([dueno.id], t1.fecha);
  assert.deepEqual(agenda.map((a) => [a.hora, a.estado]), [
    ['18:00', 'BLOQUEADO'],
    ['19:00', 'CONFIRMADO'],
  ]);
  assert.equal(agenda[0].quien, 'Mantenimiento');
  assert.equal(agenda[0].telefono, null);
  assert.equal(agenda[1].hasta, '20:00');
  assert.equal(agenda[1].pagadoOnline, 9000);
  assert.equal(agenda[1].telefono, '0341 15 555-1234');
  // Otro dueño no ve estos turnos.
  assert.deepEqual(await agendaDelDia(['otro-dueno'], t1.fecha), []);
});

test('agenda: WhatsApp con el teléfono escrito como sea', () => {
  assert.equal(enlaceWhatsApp('0341 15 555-1234'), 'https://wa.me/54341155551234');
  assert.equal(enlaceWhatsApp('+54 9 341 555 1234'), 'https://wa.me/5493415551234');
});
