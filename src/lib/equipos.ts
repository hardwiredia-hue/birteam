import { NIVELES } from './constantes';

/**
 * Armar equipos para un partido: dos lados del mismo tamaño (±1). "Parejos"
 * reparte por nivel autodeclarado en el deporte con orden de serpiente
 * (el mejor a un lado, los dos siguientes al otro…); "mezclar" es al azar.
 */

export const NOMBRES_EQUIPO: Record<number, string> = { 1: 'Con pechera', 2: 'Sin pechera' };

/** Nivel → puntaje (sin nivel cargado, en el medio). */
export function puntajeDeNivel(nivel: string | null | undefined) {
  const indice = NIVELES.indexOf((nivel ?? '') as (typeof NIVELES)[number]);
  return indice >= 0 ? indice + 1 : 2.5;
}

function mezclar<T>(lista: T[], azar: () => number) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function armarEquipos(
  jugadores: { id: string; puntaje: number }[],
  modo: 'parejos' | 'mezclar',
  azar: () => number = Math.random
): Map<string, 1 | 2> {
  const asignacion = new Map<string, 1 | 2>();
  // Se mezcla siempre primero: entre iguales, cada vez sale distinto.
  const mezclados = mezclar(jugadores, azar);
  if (modo === 'mezclar') {
    mezclados.forEach((jugador, indice) => asignacion.set(jugador.id, indice % 2 === 0 ? 1 : 2));
    return asignacion;
  }
  const ordenados = [...mezclados].sort((a, b) => b.puntaje - a.puntaje);
  // Serpiente: 1, 2, 2, 1, 1, 2, 2, 1…
  ordenados.forEach((jugador, indice) => {
    const vuelta = Math.floor(indice / 2);
    const primero = indice % 2 === 0;
    asignacion.set(jugador.id, (vuelta % 2 === 0) === primero ? 1 : 2);
  });
  return asignacion;
}
