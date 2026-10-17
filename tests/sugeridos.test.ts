import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { sugeridosParaPartido } from '../src/lib/invitaciones';
import { franjaDe } from '../src/lib/disponibilidad';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('"Pueden venir": cerca, del deporte y disponibles a esa hora', async () => {
  const sufijo = `sug${Date.now()}`;
  const { deporte, jugador } = await escenario(sufijo);
  const fecha = new Date(Date.now() + 3 * 86400_000);
  const { dia, franja } = franjaDe(fecha);
  const ciudad = `Ciudad ${sufijo}`;
  const crear = (nombre: string, disponibilidad: string, conDeporte = true) =>
    prisma.usuario.create({
      data: {
        nombre,
        usuario: `${nombre.toLowerCase()}-${sufijo}`,
        email: `${nombre.toLowerCase()}-${sufijo}@prueba.test`,
        ciudad,
        disponibilidad,
        ...(conDeporte ? { deportes: { create: { deporteId: deporte.id } } } : {}),
      },
    });
  const puede = await crear('Puede', JSON.stringify([`${dia}-${franja}`]));
  await crear('Otrahora', JSON.stringify([`${(dia + 1) % 7}-${franja}`]));
  await crear('Sincargar', '[]');
  await crear('Otrodeporte', JSON.stringify([`${dia}-${franja}`]), false);
  const anotado = await crear('Anotado', JSON.stringify([`${dia}-${franja}`]));

  const partido = await prisma.partido.create({
    data: {
      deporteId: deporte.id,
      organizadorId: jugador.id,
      fecha,
      lugarNombre: 'Club',
      ciudad,
      cupo: 10,
      participaciones: { create: [{ usuarioId: jugador.id, estado: 'VOY' }, { usuarioId: anotado.id, estado: 'TALVEZ' }] },
    },
  });
  assert.deepEqual((await sugeridosParaPartido(partido.id)).map((s) => s.nombre), ['Puede']);
  // Ya invitado: no se sugiere de nuevo.
  await prisma.notificacion.create({ data: { usuarioId: puede.id, tipo: 'INVITACION', titulo: 'x', url: `/partidos/${partido.id}` } });
  assert.deepEqual(await sugeridosParaPartido(partido.id), []);
});
