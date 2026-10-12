/** Distancia en km entre dos puntos (haversine). */
export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radianes = (grados: number) => (grados * Math.PI) / 180;
  const R = 6371;
  const dLat = radianes(lat2 - lat1);
  const dLng = radianes(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radianes(lat1)) * Math.cos(radianes(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** "1,2 km" · "12 km" · "450 m" */
export function formatearDistancia(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

/**
 * Distancia a un lugar cuya ubicación es aproximada (un partido sin cancha
 * publicada se ubica en el centro de su ciudad): sin falsa precisión.
 * "en tu zona" si queda cerca, "~12 km" si no.
 */
export function distanciaAproximada(km: number) {
  if (km < 3) return 'en tu zona';
  return `~${formatearDistancia(km)}`;
}

/** "a 1,2 km" o, si la ubicación es aproximada, "en tu zona" / "a ~12 km". */
export function rotuloDistancia(km: number, aproximada: boolean) {
  if (!aproximada) return `a ${formatearDistancia(km)}`;
  const texto = distanciaAproximada(km);
  return texto.startsWith('~') ? `a ${texto}` : texto;
}
