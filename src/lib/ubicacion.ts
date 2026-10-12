import { cookies } from 'next/headers';
import { distanciaKm } from './geo';
import { COOKIE_UBICACION } from './ubicacion-comun';

/**
 * Desde dónde se miden las distancias: la ubicación del celular (si la
 * persona la compartió) o, si no, el centro de la ciudad de su perfil.
 *
 * La del celular viaja en una cookie corta (6 h) y redondeada a ~100 m: no se
 * guarda en la base ni queda en el historial de nadie.
 */
export { COOKIE_UBICACION, DURACION_UBICACION_SEG } from './ubicacion-comun';

/** Radios para "hasta X km" (y sin límite). */
export const RADIOS_KM = [2, 5, 15, 30, 50] as const;

export interface Punto {
  latitud: number;
  longitud: number;
}

export interface Ubicacion extends Punto {
  origen: 'dispositivo' | 'ciudad';
}

/** "lat,lng" → punto, o null si no es una coordenada válida. */
export function leerCoordenadas(valor: string | undefined | null): Punto | null {
  if (!valor) return null;
  const [lat, lng] = valor.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { latitud: lat, longitud: lng };
}

/** La ubicación con la que se ordena por cercanía (null si no hay ninguna). */
export async function ubicacionDe(usuario: { latitud: number | null; longitud: number | null }): Promise<Ubicacion | null> {
  const dispositivo = leerCoordenadas((await cookies()).get(COOKIE_UBICACION)?.value);
  if (dispositivo) return { ...dispositivo, origen: 'dispositivo' };
  if (usuario.latitud != null && usuario.longitud != null) {
    return { latitud: usuario.latitud, longitud: usuario.longitud, origen: 'ciudad' };
  }
  return null;
}

/** El radio pedido en la URL, si es uno de los que se ofrecen. */
export function radioDelParametro(valor: string | undefined): number | null {
  const numero = Number(valor);
  return (RADIOS_KM as readonly number[]).includes(numero) ? numero : null;
}

/** Km desde la ubicación hasta un lugar (null si falta alguno de los dos). */
export function kmHasta(
  desde: Punto | null,
  lugar: { latitud: number | null; longitud: number | null }
): number | null {
  if (!desde || lugar.latitud == null || lugar.longitud == null) return null;
  return distanciaKm(desde.latitud, desde.longitud, lugar.latitud, lugar.longitud);
}

/** Dentro del radio (sin radio, todo entra; sin distancia conocida, no entra). */
export function dentroDelRadio(km: number | null, radio: number | null) {
  return radio == null || (km != null && km <= radio);
}
