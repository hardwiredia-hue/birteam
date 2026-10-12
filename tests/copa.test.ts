import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avanzarCopa, ganadorCruce, nombreRonda, rondasDeCopa, sortearCuadro, type PartidoCopa } from '../src/lib/torneos';

const resultado = (
  cruce: { ronda: number; llave: number; localId: string; visitanteId: string },
  gl: number,
  gv: number,
  penales: [number, number] | null = null
): PartidoCopa => ({
  ...cruce,
  golesLocal: gl,
  golesVisitante: gv,
  penalesLocal: penales?.[0] ?? null,
  penalesVisitante: penales?.[1] ?? null,
});

test('copa: el cuadro es potencia de 2, con libres sin juntarse', () => {
  for (const n of [2, 3, 5, 6, 8, 11, 16, 24]) {
    const ids = Array.from({ length: n }, (_, i) => `e${i}`);
    const cuadro = sortearCuadro(ids);
    assert.equal(cuadro.length & (cuadro.length - 1), 0, `${n} equipos → ${cuadro.length}`);
    assert.equal(cuadro.filter(Boolean).length, n);
    for (let i = 0; i < cuadro.length; i += 2) assert.ok(cuadro[i] || cuadro[i + 1], 'nunca dos libres juntos');
  }
});

test('copa: empate se define por penales; sin penales no pasa nadie', () => {
  const base = { ronda: 1, llave: 0, localId: 'a', visitanteId: 'b' };
  assert.equal(ganadorCruce(resultado(base, 2, 1)), 'a');
  assert.equal(ganadorCruce(resultado(base, 1, 1, [4, 5])), 'b');
  assert.equal(ganadorCruce(resultado(base, 1, 1)), null);
  assert.equal(nombreRonda(3, 3), 'Final');
  assert.equal(nombreRonda(2, 3), 'Semifinal');
  assert.equal(nombreRonda(1, 3), 'Cuartos de final');
});

test('copa: 5 equipos, de la primera ronda al campeón', () => {
  // Cuadro de 8: a, b y c pasan directo; d-e se juega.
  const cuadro = ['a', null, 'b', null, 'c', null, 'd', 'e'];
  assert.equal(rondasDeCopa(cuadro), 3);
  const partidos: PartidoCopa[] = [];

  let paso = avanzarCopa(cuadro, partidos);
  assert.deepEqual(paso.crear, [{ ronda: 1, llave: 3, localId: 'd', visitanteId: 'e' }]);
  assert.equal(avanzarCopa(cuadro, [{ ...paso.crear[0], golesLocal: null, golesVisitante: null, penalesLocal: null, penalesVisitante: null }]).crear.length, 0, 'esperando el resultado');

  partidos.push(resultado(paso.crear[0], 0, 0, [3, 4])); // pasa e por penales
  paso = avanzarCopa(cuadro, partidos);
  assert.deepEqual(paso.crear, [
    { ronda: 2, llave: 0, localId: 'a', visitanteId: 'b' },
    { ronda: 2, llave: 1, localId: 'c', visitanteId: 'e' },
  ]);

  partidos.push(resultado(paso.crear[0], 3, 1), resultado(paso.crear[1], 0, 2));
  paso = avanzarCopa(cuadro, partidos);
  assert.deepEqual(paso.crear, [{ ronda: 3, llave: 0, localId: 'a', visitanteId: 'e' }]);

  partidos.push(resultado(paso.crear[0], 1, 2));
  paso = avanzarCopa(cuadro, partidos);
  assert.deepEqual(paso, { crear: [], campeonId: 'e' });
});
