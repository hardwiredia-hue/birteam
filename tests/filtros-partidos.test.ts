import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrarPartidos } from '../src/lib/filtros-partidos';

const p = (id: string, deporteId: string, nivel: string | null, cupo: number, van: number) => ({
  id, deporteId, nivel, cupo, participaciones: Array.from({ length: van }),
});

test('Explorar: "Para mi nivel" y "Les faltan jugadores"', () => {
  const partidos = [
    p('sin-nivel', 'f5', null, 10, 10),
    p('intermedio', 'f5', 'INTERMEDIO', 10, 4),
    p('avanzado', 'f5', 'AVANZADO', 10, 4),
    p('padel-avanzado', 'padel', 'AVANZADO', 4, 2),
  ];
  const ids = (lista: { id: string }[]) => lista.map((x) => x.id);
  const mio = new Map([['f5', 'INTERMEDIO'], ['padel', null]]);
  assert.deepEqual(ids(filtrarPartidos(partidos, { paraMiNivel: null, soloConLugar: false })), ids(partidos));
  assert.deepEqual(ids(filtrarPartidos(partidos, { paraMiNivel: mio, soloConLugar: false })), ['sin-nivel', 'intermedio', 'padel-avanzado'], 'sin nivel cargado en pádel: todos');
  assert.deepEqual(ids(filtrarPartidos(partidos, { paraMiNivel: null, soloConLugar: true })), ['intermedio', 'avanzado', 'padel-avanzado']);
  assert.deepEqual(ids(filtrarPartidos(partidos, { paraMiNivel: mio, soloConLugar: true })), ['intermedio', 'padel-avanzado']);
});
