import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { esVecino, posiblesVecinos, vecinosDe } from '../src/lib/cercania';

after(() => prisma.$disconnect());

const rosario = { ciudad: 'Rosario', latitud: -32.9468, longitud: -60.6393 };

test('cercanía: dentro del radio de cada uno, o misma ciudad sin coordenadas', () => {
  // Funes queda a unos 15 km de Rosario.
  const funes = { ciudad: 'Funes', latitud: -32.9167, longitud: -60.8167 };
  assert.equal(esVecino({ ...funes, radioKm: 30 }, rosario), true);
  assert.equal(esVecino({ ...funes, radioKm: 5 }, rosario), false);
  // Sin coordenadas: vale la ciudad, como antes.
  assert.equal(esVecino({ ciudad: 'Rosario', latitud: null, longitud: null, radioKm: 5 }, rosario), true);
  assert.equal(esVecino({ ciudad: 'Funes', latitud: null, longitud: null, radioKm: 50 }, rosario), false);
  assert.equal(posiblesVecinos({ ciudad: null, latitud: null, longitud: null }), null);
});

test('cercanía: los más cerca primero y con tope', () => {
  const lista = [
    { id: 'lejos', ciudad: 'Funes', latitud: -32.9167, longitud: -60.8167, radioKm: 30 },
    { id: 'ciudad', ciudad: 'Rosario', latitud: null, longitud: null, radioKm: 15 },
    { id: 'cerca', ciudad: 'Rosario', latitud: -32.95, longitud: -60.65, radioKm: 15 },
    { id: 'afuera', ciudad: 'Córdoba', latitud: -31.42, longitud: -64.18, radioKm: 50 },
  ];
  assert.deepEqual(vecinosDe(lista, rosario, 10).map((v) => v.id), ['cerca', 'lejos', 'ciudad']);
  assert.deepEqual(vecinosDe(lista, rosario, 1).map((v) => v.id), ['cerca']);
});

test('cercanía: el filtro de la base trae ciudad y cuadrado de 50 km', async () => {
  const sufijo = `cer${Date.now()}`;
  const crear = (n: string, datos: { ciudad?: string; latitud?: number; longitud?: number }) =>
    prisma.usuario.create({ data: { nombre: n, usuario: `${n}-${sufijo}`, email: `${n}-${sufijo}@prueba.test`, ...datos } });
  const a = await crear('funes', { ciudad: 'Funes', latitud: -32.9167, longitud: -60.8167 });
  const b = await crear('sinco', { ciudad: 'Rosario' });
  const c = await crear('cordoba', { ciudad: 'Córdoba', latitud: -31.42, longitud: -64.18 });
  const encontrados = await prisma.usuario.findMany({
    where: { id: { in: [a.id, b.id, c.id] }, ...posiblesVecinos(rosario)! },
    select: { id: true },
  });
  assert.deepEqual(new Set(encontrados.map((u) => u.id)), new Set([a.id, b.id]));
});
