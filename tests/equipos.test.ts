import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarEquipos, puntajeDeNivel } from '../src/lib/equipos';

const jugadores = [4, 4, 3, 3, 3, 2, 2, 2, 1, 1].map((puntaje, i) => ({ id: `j${i}`, puntaje }));
const suma = (asignacion: Map<string, number>, equipo: number) =>
  jugadores.filter((j) => asignacion.get(j.id) === equipo).reduce((total, j) => total + j.puntaje, 0);

test('equipos parejos: mismo tamaño y niveles repartidos', () => {
  for (let semilla = 0; semilla < 20; semilla++) {
    let x = semilla + 1;
    const azar = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
    const asignacion = armarEquipos(jugadores, 'parejos', azar);
    const uno = [...asignacion.values()].filter((e) => e === 1).length;
    assert.equal(uno, 5);
    assert.ok(Math.abs(suma(asignacion, 1) - suma(asignacion, 2)) <= 2, `diferencia de nivel ${suma(asignacion, 1)} vs ${suma(asignacion, 2)}`);
    // Los dos mejores nunca quedan juntos.
    assert.notEqual(asignacion.get('j0'), asignacion.get('j1'));
  }
});

test('equipos: con número impar, uno tiene un jugador más; mezclar reparte a todos', () => {
  const impares = jugadores.slice(0, 7);
  const asignacion = armarEquipos(impares, 'mezclar');
  assert.equal(asignacion.size, 7);
  const uno = [...asignacion.values()].filter((e) => e === 1).length;
  assert.ok(uno === 3 || uno === 4);
});

test('nivel a puntaje: sin nivel queda en el medio', () => {
  assert.equal(puntajeDeNivel('INICIAL'), 1);
  assert.equal(puntajeDeNivel('COMPETITIVO'), 4);
  assert.equal(puntajeDeNivel(null), 2.5);
});
