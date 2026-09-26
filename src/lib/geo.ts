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
