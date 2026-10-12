import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { buscarDonde } from '../src/lib/lugares';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('dónde juegan: busca canchas publicadas, por nombre o cerca', async () => {
  const sufijo = `bus${Date.now()}`;
  const { cancha, deporte } = await escenario(sufijo);
  await prisma.cancha.update({ where: { id: cancha.id }, data: { ciudad: 'Rosario', latitud: -32.95, longitud: -60.64 } });
  const desde = { latitud: -32.95, longitud: -60.65 };

  // Sin importar tildes ni mayúsculas.
  const porNombre = await buscarDonde({ q: `CANCHA ${sufijo}`, desde, ciudad: 'Rosario' });
  assert.equal(porNombre.canchas[0]?.id, cancha.id);
  assert.ok(porNombre.canchas[0].km != null && porNombre.canchas[0].km < 2);
  // Sin texto: las cercanas del deporte.
  const cerca = await buscarDonde({ deporteId: deporte.id, desde, ciudad: 'Rosario' });
  assert.ok(cerca.canchas.some((c) => c.id === cancha.id));
  // Lejos y sin texto: no aparece.
  const lejos = await buscarDonde({ deporteId: deporte.id, desde: { latitud: -31.42, longitud: -64.18 }, ciudad: 'Córdoba' });
  assert.ok(!lejos.canchas.some((c) => c.id === cancha.id));
});

test('dónde juegan: una cancha sin suscripción al día no aparece', async () => {
  const sufijo = `sus${Date.now()}`;
  const { cancha, dueno } = await escenario(sufijo);
  await prisma.usuario.update({ where: { id: dueno.id }, data: { suscripcionHasta: new Date(Date.now() - 86400_000) } });
  const resultado = await buscarDonde({ q: `cancha ${sufijo}`, desde: null });
  assert.ok(!resultado.canchas.some((c) => c.id === cancha.id));
});

test('dónde juegan: solo canchas del deporte o de su familia', async () => {
  const sufijo = `fam${Date.now()}`;
  const { cancha } = await escenario(sufijo);
  const crear = (slug: string, nombre: string) =>
    prisma.deporte.upsert({ where: { slug }, create: { slug, nombre, orden: 50 }, update: {} });
  const f5 = await crear('futbol-5', 'Fútbol 5');
  const f7 = await crear('futbol-7', 'Fútbol 7');
  const padel = await crear('padel', 'Pádel');
  await prisma.cancha.update({ where: { id: cancha.id }, data: { deporteId: f5.id } });
  const paraF7 = await buscarDonde({ q: `cancha ${sufijo}`, deporteId: f7.id, desde: null });
  assert.equal(paraF7.canchas[0]?.id, cancha.id);
  const paraPadel = await buscarDonde({ q: `cancha ${sufijo}`, deporteId: padel.id, desde: null });
  assert.equal(paraPadel.canchas.length, 0);
});
