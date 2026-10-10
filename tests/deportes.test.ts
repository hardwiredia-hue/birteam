import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparDeportes, nombreDelFiltro, seleccionDelFiltro, slugsDelFiltro } from '../src/lib/deportes';

const deportes = [
  { id: '1', nombre: 'Fútbol 5', slug: 'futbol-5' },
  { id: '2', nombre: 'Fútbol 7', slug: 'futbol-7' },
  { id: '3', nombre: 'Fútbol 11', slug: 'futbol-11' },
  { id: '4', nombre: 'Básquet', slug: 'basquet' },
  { id: '5', nombre: 'Básquet 3x3', slug: 'basquet-3x3' },
  { id: '6', nombre: 'Vóley', slug: 'voley' },
  { id: '7', nombre: 'Curling', slug: 'curling' },
];

test('agrupa las modalidades en familias y respeta el orden', () => {
  const familias = agruparDeportes(deportes);
  assert.deepEqual(
    familias.map((f) => [f.clave, f.opciones.map((o) => o.modalidad)]),
    [
      ['futbol', ['Fútbol 5', 'Fútbol 7', 'Fútbol 11']],
      ['basquet', ['5x5', '3x3']],
      ['voley', ['Vóley']],
      ['curling', ['Curling']],
    ]
  );
  assert.equal(familias[3].icono, 'generico');
});

test('el filtro por familia trae todas sus modalidades; por tipo, solo esa', () => {
  assert.deepEqual(slugsDelFiltro('futbol', deportes), ['futbol-5', 'futbol-7', 'futbol-11']);
  assert.deepEqual(slugsDelFiltro('basquet', deportes), ['basquet', 'basquet-3x3']);
  assert.deepEqual(slugsDelFiltro('basquet-5x5', deportes), ['basquet']);
  assert.deepEqual(slugsDelFiltro('basquet-3x3', deportes), ['basquet-3x3']);
  assert.deepEqual(slugsDelFiltro('voley', deportes), ['voley']);
  assert.equal(slugsDelFiltro(undefined, deportes), null);
});

test('marca la familia y el tipo elegidos', () => {
  assert.deepEqual(seleccionDelFiltro('futbol-7', deportes), { familia: 'futbol', modalidad: 'futbol-7' });
  assert.deepEqual(seleccionDelFiltro('basquet', deportes), { familia: 'basquet', modalidad: null });
  assert.deepEqual(seleccionDelFiltro('basquet-5x5', deportes), { familia: 'basquet', modalidad: 'basquet-5x5' });
  assert.equal(nombreDelFiltro('futbol', deportes), 'Fútbol');
  assert.equal(nombreDelFiltro('basquet-3x3', deportes), 'Básquet 3x3');
});
