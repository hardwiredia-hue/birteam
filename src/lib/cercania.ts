import type { Prisma } from '@prisma/client';
import { distanciaKm } from './geo';

/**
 * Quién está "cerca" de un lugar para los avisos (faltan jugadores, Radar):
 * con coordenadas de los dos lados, que esté dentro del radio que la persona
 * eligió en su perfil; si falta alguna, que sea de la misma ciudad (como
 * antes). Así alguien de Funes se entera de un partido en Rosario.
 */

/** El radio más grande que se puede elegir: acota la búsqueda en la base. */
export const RADIO_MAXIMO_AVISOS_KM = 50;
export const RADIOS_AVISOS_KM = [5, 15, 30, 50] as const;

interface Lugar {
  ciudad: string | null;
  latitud: number | null;
  longitud: number | null;
}

interface Vecino extends Lugar {
  radioKm: number;
}

/**
 * Filtro para la base: misma ciudad, o coordenadas dentro del cuadrado que
 * cubre el radio máximo (el círculo exacto lo hace esVecino).
 */
export function posiblesVecinos(lugar: Lugar): Prisma.UsuarioWhereInput | null {
  const opciones: Prisma.UsuarioWhereInput[] = [];
  if (lugar.ciudad) opciones.push({ ciudad: lugar.ciudad });
  if (lugar.latitud != null && lugar.longitud != null) {
    const dLat = RADIO_MAXIMO_AVISOS_KM / 111;
    const dLng = RADIO_MAXIMO_AVISOS_KM / (111 * Math.max(0.2, Math.cos((lugar.latitud * Math.PI) / 180)));
    opciones.push({
      latitud: { gte: lugar.latitud - dLat, lte: lugar.latitud + dLat },
      longitud: { gte: lugar.longitud - dLng, lte: lugar.longitud + dLng },
    });
  }
  return opciones.length > 0 ? { OR: opciones } : null;
}

/** Km entre la persona y el lugar (null si a alguno le faltan coordenadas). */
export function kmEntre(persona: Lugar, lugar: Lugar) {
  if (persona.latitud == null || persona.longitud == null || lugar.latitud == null || lugar.longitud == null) {
    return null;
  }
  return distanciaKm(persona.latitud, persona.longitud, lugar.latitud, lugar.longitud);
}

export function esVecino(persona: Vecino, lugar: Lugar) {
  const km = kmEntre(persona, lugar);
  if (km != null) return km <= persona.radioKm;
  return Boolean(lugar.ciudad && persona.ciudad === lugar.ciudad);
}

/** Los vecinos de un lugar, los más cerca primero (los de "misma ciudad" sin km, al final). */
export function vecinosDe<T extends Vecino>(candidatos: T[], lugar: Lugar, limite: number) {
  return candidatos
    .filter((c) => esVecino(c, lugar))
    .map((c) => ({ c, km: kmEntre(c, lugar) }))
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity))
    .slice(0, limite)
    .map(({ c }) => c);
}
