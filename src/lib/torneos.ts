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

// ---------- Copa: eliminación directa ----------

export interface PartidoCopa {
  ronda: number;
  llave: number | null;
  localId: string;
  visitanteId: string;
  golesLocal: number | null;
  golesVisitante: number | null;
  penalesLocal: number | null;
  penalesVisitante: number | null;
}

/**
 * Sorteo del cuadro: los equipos mezclados en una llave del tamaño de la
 * potencia de 2 siguiente. Los que sobran pasan directo a la segunda ronda
 * (nunca quedan dos "libres" juntos).
 */
export function sortearCuadro(equipoIds: string[], azar: () => number = Math.random): (string | null)[] {
  const mezclados = [...equipoIds];
  for (let i = mezclados.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [mezclados[i], mezclados[j]] = [mezclados[j], mezclados[i]];
  }
  let tam = 2;
  while (tam < mezclados.length) tam *= 2;
  const libres = tam - mezclados.length;
  const cuadro: (string | null)[] = [];
  let indice = 0;
  for (let cruce = 0; cruce < tam / 2; cruce++) {
    cuadro.push(mezclados[indice++]);
    cuadro.push(cruce < libres ? null : mezclados[indice++]);
  }
  return cuadro;
}

/** Quién pasa de un cruce: el que hizo más goles o, si empataron, más penales. */
export function ganadorCruce(partido: PartidoCopa): string | null {
  const { golesLocal: gl, golesVisitante: gv, penalesLocal: pl, penalesVisitante: pv } = partido;
  if (gl === null || gv === null) return null;
  if (gl !== gv) return gl > gv ? partido.localId : partido.visitanteId;
  if (pl == null || pv == null || pl === pv) return null;
  return pl > pv ? partido.localId : partido.visitanteId;
}

/** "Final", "Semifinal", "Cuartos de final"… según cuántos equipos quedan en la ronda. */
export function nombreRonda(ronda: number, totalRondas: number) {
  const faltan = totalRondas - ronda;
  if (faltan === 0) return 'Final';
  if (faltan === 1) return 'Semifinal';
  if (faltan === 2) return 'Cuartos de final';
  if (faltan === 3) return 'Octavos de final';
  return `Ronda ${ronda}`;
}

export function rondasDeCopa(cuadro: (string | null)[]) {
  return Math.round(Math.log2(cuadro.length));
}

/**
 * Estado de la copa: los cruces que faltan crear (de la primera ronda que no
 * está completa), si hay que esperar resultados, o el campeón.
 */
export function avanzarCopa(
  cuadro: (string | null)[],
  partidos: PartidoCopa[]
): { crear: { ronda: number; llave: number; localId: string; visitanteId: string }[]; campeonId: string | null } {
  let lugares = cuadro;
  for (let ronda = 1; lugares.length > 1; ronda++) {
    const siguiente: (string | null)[] = [];
    const crear: { ronda: number; llave: number; localId: string; visitanteId: string }[] = [];
    let incompleta = false;
    for (let llave = 0; llave < lugares.length / 2; llave++) {
      const a = lugares[llave * 2];
      const b = lugares[llave * 2 + 1];
      if (a && b) {
        const partido = partidos.find((p) => p.ronda === ronda && p.llave === llave);
        if (!partido) {
          crear.push({ ronda, llave, localId: a, visitanteId: b });
          incompleta = true;
          siguiente.push(null);
          continue;
        }
        const ganador = ganadorCruce(partido);
        if (!ganador) incompleta = true;
        siguiente.push(ganador);
      } else {
        // Pasa directo el que está (libre en la primera ronda).
        siguiente.push(a ?? b);
      }
    }
    if (crear.length > 0 || incompleta) return { crear, campeonId: null };
    lugares = siguiente;
  }
  return { crear: [], campeonId: lugares[0] ?? null };
}
