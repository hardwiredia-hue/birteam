/** Fixture de liga (todos contra todos, una rueda), método del círculo. */
export function fixtureLiga(equipoIds: string[]): { ronda: number; localId: string; visitanteId: string }[] {
  const LIBRE = '__libre__';
  const equipos = [...equipoIds];
  if (equipos.length % 2 === 1) equipos.push(LIBRE);
  const n = equipos.length;
  const partidos: { ronda: number; localId: string; visitanteId: string }[] = [];

  let rueda = [...equipos];
  for (let ronda = 1; ronda <= n - 1; ronda++) {
    for (let i = 0; i < n / 2; i++) {
      const a = rueda[i];
      const b = rueda[n - 1 - i];
      if (a === LIBRE || b === LIBRE) continue;
      // Alternar localías para que nadie sea siempre local.
      partidos.push(
        ronda % 2 === 1
          ? { ronda, localId: a, visitanteId: b }
          : { ronda, localId: b, visitanteId: a }
      );
    }
    // Rotación: el primero queda fijo, el resto gira.
    rueda = [rueda[0], rueda[n - 1], ...rueda.slice(1, n - 1)];
  }
  return partidos;
}

export interface FilaTabla {
  equipoId: string;
  nombre: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dif: number;
  puntos: number;
}

/** Tabla de posiciones: 3 puntos por ganar, 1 por empatar. */
export function calcularTabla(
  equipos: { id: string; nombre: string }[],
  partidos: { localId: string; visitanteId: string; golesLocal: number | null; golesVisitante: number | null }[]
): FilaTabla[] {
  const tabla = new Map<string, FilaTabla>(
    equipos.map((equipo) => [
      equipo.id,
      { equipoId: equipo.id, nombre: equipo.nombre, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dif: 0, puntos: 0 },
    ])
  );

  for (const partido of partidos) {
    if (partido.golesLocal === null || partido.golesVisitante === null) continue;
    const local = tabla.get(partido.localId);
    const visitante = tabla.get(partido.visitanteId);
    if (!local || !visitante) continue;

    local.pj++; visitante.pj++;
    local.gf += partido.golesLocal; local.gc += partido.golesVisitante;
    visitante.gf += partido.golesVisitante; visitante.gc += partido.golesLocal;

    if (partido.golesLocal > partido.golesVisitante) {
      local.pg++; local.puntos += 3; visitante.pp++;
    } else if (partido.golesLocal < partido.golesVisitante) {
      visitante.pg++; visitante.puntos += 3; local.pp++;
    } else {
      local.pe++; visitante.pe++; local.puntos++; visitante.puntos++;
    }
  }

  return [...tabla.values()]
    .map((fila) => ({ ...fila, dif: fila.gf - fila.gc }))
    .sort((a, b) => b.puntos - a.puntos || b.dif - a.dif || b.gf - a.gf || a.nombre.localeCompare(b.nombre));
}
