import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { buscarDonde, lugarParaPartido } from '../src/lib/lugares';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('lugares: se crea una vez y después se reusa, escrito como sea', async () => {
  const sufijo = `lug${Date.now()}`;
  const { jugador, otro } = await escenario(sufijo);
  const nombre = `Plaza Álem ${sufijo}`;
  const primero = await lugarParaPartido({ nombre, ciudad: 'Rosario', creadorId: jugador.id });
  assert.equal(primero.usos, 1);
  // Otra persona, sin tildes y en mayúsculas: el mismo lugar, y completa el teléfono.
  const segundo = await lugarParaPartido({
    nombre: nombre.toUpperCase().replace('Á', 'A'),
    telefono: '341 555',
    ciudad: 'Rosario',
    creadorId: otro.id,
  });
  assert.equal(segundo.id, primero.id);
  assert.equal(segundo.usos, 2);
  assert.equal(segundo.telefono, '341 555');
  assert.equal(segundo.nombre, nombre);
  // Mismo nombre en otra ciudad: es otro lugar.
  const otraCiudad = await lugarParaPartido({ nombre, ciudad: 'Funes', creadorId: otro.id });
  assert.notEqual(otraCiudad.id, primero.id);
  // Elegido de la lista por id: ese, aunque el nombre escrito difiera.
  const elegido = await lugarParaPartido({ lugarId: primero.id, nombre: 'cualquiera', creadorId: otro.id });
  assert.equal(elegido.id, primero.id);
});

test('lugares: la búsqueda encuentra canchas publicadas y lugares de la comunidad', async () => {
  const sufijo = `bus${Date.now()}`;
  const { jugador, cancha, deporte } = await escenario(sufijo);
  await prisma.cancha.update({ where: { id: cancha.id }, data: { ciudad: 'Rosario', latitud: -32.95, longitud: -60.64 } });
  await lugarParaPartido({ nombre: `Club Bús ${sufijo}`, ciudad: 'Rosario', creadorId: jugador.id });
  const desde = { latitud: -32.95, longitud: -60.65 };

  const porLugar = await buscarDonde({ q: `club bus ${sufijo}`, desde, ciudad: 'Rosario' });
  assert.equal(porLugar.lugares.length, 1);
  const porCancha = await buscarDonde({ q: `cancha ${sufijo}`, desde, ciudad: 'Rosario' });
  assert.equal(porCancha.canchas[0]?.id, cancha.id);
  assert.ok(porCancha.canchas[0].km != null && porCancha.canchas[0].km < 2);
  // Sin texto: las canchas cercanas del deporte.
  const cerca = await buscarDonde({ deporteId: deporte.id, desde, ciudad: 'Rosario' });
  assert.ok(cerca.canchas.some((c) => c.id === cancha.id));
});
