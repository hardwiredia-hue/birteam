import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { completarCoordenadasDePartidos, coordenadasDelLugar } from '../src/lib/coordenadas';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

async function ciudades() {
  await prisma.pais.upsert({ where: { codigo: 'ZZ' }, create: { codigo: 'ZZ', nombre: 'Prueba' }, update: {} });
  const santaFe = await prisma.provincia.upsert({
    where: { paisCodigo_nombre: { paisCodigo: 'ZZ', nombre: 'Santa Fe' } },
    create: { paisCodigo: 'ZZ', nombre: 'Santa Fe' },
    update: {},
  });
  const otra = await prisma.provincia.upsert({
    where: { paisCodigo_nombre: { paisCodigo: 'ZZ', nombre: 'Otra' } },
    create: { paisCodigo: 'ZZ', nombre: 'Otra' },
    update: {},
  });
  // La misma ciudad de nombre en dos provincias.
  for (const [provinciaId, latitud] of [[otra.id, -10], [santaFe.id, -32.95]] as const) {
    await prisma.ciudad.upsert({
      where: { provinciaId_nombre: { provinciaId, nombre: 'Villa Prueba' } },
      create: { provinciaId, nombre: 'Villa Prueba', nombreNorm: 'villa prueba', latitud, longitud: -60.6 },
      update: {},
    });
  }
}

test('coordenadas: la cancha manda; si no, la ciudad con su provincia', async () => {
  await ciudades();
  const { cancha } = await escenario(`coo${Date.now()}`);
  await prisma.cancha.update({ where: { id: cancha.id }, data: { latitud: -32.9, longitud: -60.7 } });
  assert.deepEqual(await coordenadasDelLugar({ canchaId: cancha.id, ciudad: 'Villa Prueba' }), { latitud: -32.9, longitud: -60.7 });
  assert.equal((await coordenadasDelLugar({ ciudad: 'Villa Prueba', provincia: 'Santa Fe' }))?.latitud, -32.95);
  assert.equal((await coordenadasDelLugar({ ciudad: 'VILLA PRUEBA', provincia: 'Otra' }))?.latitud, -10);
  assert.equal(await coordenadasDelLugar({ ciudad: 'No Existe' }), null);
  assert.equal(await coordenadasDelLugar({}), null);
});

test('coordenadas: completa los partidos próximos sin pisar los que ya tienen', async () => {
  await ciudades();
  const { deporte, jugador } = await escenario(`cop${Date.now()}`);
  const base = {
    deporteId: deporte.id,
    organizadorId: jugador.id,
    fecha: new Date(Date.now() + 86400_000),
    lugarNombre: 'Club',
    cupo: 10,
    ciudad: 'Villa Prueba',
    provincia: 'Santa Fe',
  };
  const sin = await prisma.partido.create({ data: base });
  const con = await prisma.partido.create({ data: { ...base, latitud: 1, longitud: 1 } });
  const viejo = await prisma.partido.create({ data: { ...base, fecha: new Date(Date.now() - 86400_000) } });
  assert.ok((await completarCoordenadasDePartidos()) >= 1);
  assert.equal((await prisma.partido.findUnique({ where: { id: sin.id } }))?.latitud, -32.95);
  assert.equal((await prisma.partido.findUnique({ where: { id: con.id } }))?.latitud, 1);
  assert.equal((await prisma.partido.findUnique({ where: { id: viejo.id } }))?.latitud, null);
});
