import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nombresEnSerie, siguienteNombre } from '../src/lib/serie';
import { cupoSugerido, jugadoresPorLado } from '../src/lib/deportes';

test('nombres en serie: sigue la numeración y respeta cómo estaba escrito', () => {
  assert.equal(siguienteNombre('Cancha 3'), 'Cancha 4');
  assert.equal(siguienteNombre('La Redonda F5'), 'La Redonda F6');
  assert.equal(siguienteNombre('La Redonda'), 'La Redonda 2');
  assert.deepEqual(nombresEnSerie('Cancha', 3), ['Cancha 1', 'Cancha 2', 'Cancha 3']);
  assert.deepEqual(nombresEnSerie('Cancha 4', 2), ['Cancha 4', 'Cancha 5']);
  assert.deepEqual(nombresEnSerie('  Pádel  ', 1), ['Pádel']);
});

test('cupo sugerido según el deporte', () => {
  assert.deepEqual(cupoSugerido({ slug: 'futbol-5' }), { cupo: 10, minimo: 8 });
  assert.deepEqual(cupoSugerido({ slug: 'futbol-7' }), { cupo: 14, minimo: 12 });
  assert.deepEqual(cupoSugerido({ slug: 'padel' }), { cupo: 4, minimo: 4 });
  assert.deepEqual(cupoSugerido({ slug: 'running' }), { cupo: 20, minimo: 2 });
  assert.equal(jugadoresPorLado('Básquet 3x3'), 3);
  assert.equal(jugadoresPorLado('Fútbol 11'), 11);
});
