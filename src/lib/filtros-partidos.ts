/**
 * Filtros de Explorar → Partidos. "Para mi nivel": los partidos sin nivel
 * sugerido o del nivel que la persona cargó para ese deporte (si no cargó
 * nivel, todos). "Les faltan jugadores": los que todavía tienen lugar.
 */
export function filtrarPartidos<T extends { deporteId: string; nivel: string | null; cupo: number; participaciones: unknown[] }>(
  partidos: T[],
  opciones: { paraMiNivel: Map<string, string | null> | null; soloConLugar: boolean }
) {
  return partidos.filter((p) => {
    if (opciones.soloConLugar && p.participaciones.length >= p.cupo) return false;
    if (!opciones.paraMiNivel || !p.nivel) return true;
    const mio = opciones.paraMiNivel.get(p.deporteId);
    return !mio || mio === p.nivel;
  });
}
