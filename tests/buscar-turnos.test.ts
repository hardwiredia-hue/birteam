import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { buscarTurnosLibres, claveOcupa } from '../src/lib/reservas';
import { escenario, turno } from './ayuda';

after(() => prisma.$disconnect());

test('buscar turno: solo lo libre de verdad, con el precio del Radar y en el rango pedido', async () => {
  const { deporte, otro, cancha } = await escenario('buscar');
  const { fecha, inicio } = turno(2, '21:00');
  await prisma.reserva.create({
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
  await prisma.ofertaTurno.create({
    data: {
      canchaId: cancha.id,
      fecha,
      hora: '22:00',
      inicio: turno(2, '22:00').inicio,
      precioOriginal: 30000,
      precioOferta: 21000,
    },
  });

  const [resultado] = await buscarTurnosLibres({
    deporteIds: [deporte.id],
    fecha,
    desde: 20 * 60,
    hasta: 23 * 60,
    cerca: 21 * 60,
  });
  assert.equal(resultado.canchaId, cancha.id);
  // 21:00 está tomado; 20:00 y 22:00 libres (23:00 queda fuera del rango).
  assert.deepEqual(
    resultado.turnos.map((t) => t.hora),
    ['20:00', '22:00']
  );
  const oferta = resultado.turnos.find((t) => t.hora === '22:00')!;
  assert.equal(oferta.precio, 21000);
  assert.equal(oferta.descuento, 30);
  assert.equal(resultado.turnos.find((t) => t.hora === '20:00')!.precio, 30000);

  // Otro deporte: no aparece.
  const otroDeporte = await prisma.deporte.create({ data: { nombre: 'Otro buscar', slug: 'otro-buscar', orden: 99 } });
  assert.deepEqual(await buscarTurnosLibres({ deporteIds: [otroDeporte.id], fecha }), []);
});
