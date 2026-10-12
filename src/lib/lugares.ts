import { prisma } from './db';
import { normalizar } from './normalizar';
import { kmHasta, type Punto } from './ubicacion';
import { infoDeporte } from './deportes';

/**
 * Los deportes donde se puede jugar uno dado: su familia (Fútbol 7 se puede
 * jugar en una cancha de Fútbol 5, 7 u 11; nunca en una de pádel).
 */
export async function deportesCompatibles(deporteId: string) {
  const deportes = await prisma.deporte.findMany({ select: { id: true, nombre: true, slug: true } });
  const elegido = deportes.find((d) => d.id === deporteId);
  if (!elegido) return [deporteId];
  const clave = infoDeporte(elegido).clave;
  return deportes.filter((d) => infoDeporte(d).clave === clave).map((d) => d.id);
}

/**
 * "¿Dónde juegan?": las canchas publicadas en birteam. Las cargan solo sus
 * dueños (cuenta de complejo). Un jugador elige una de estas o escribe el
 * lugar a mano, y eso queda solo en su partido: no se guarda como cancha.
 */

export interface CanchaParaElegir {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
  deporteId: string;
  deporte: string;
  diasDisponibles: number[];
  km: number | null;
}

const MAXIMO = 6;

function dias(texto: string) {
  try {
    return JSON.parse(texto) as number[];
  } catch {
    return [0, 1, 2, 3, 4, 5, 6];
  }
}

/**
 * Sin texto: las canchas cercanas. Con texto: las que coinciden por nombre,
 * dirección o ciudad, sin importar tildes ni mayúsculas. Siempre del deporte
 * elegido o de su familia, las del mismo deporte primero.
 */
export async function buscarDonde(opciones: {
  q?: string | null;
  deporteId?: string | null;
  desde: Punto | null;
  ciudad?: string | null;
}): Promise<{ canchas: CanchaParaElegir[] }> {
  const buscado = opciones.q ? normalizar(opciones.q) : '';
  const conTexto = buscado.length >= 2;
  // Con deporte elegido: solo canchas de su familia (las del mismo, primero).
  const compatibles = opciones.deporteId ? await deportesCompatibles(opciones.deporteId) : null;

  const canchas = await prisma.cancha.findMany({
    where: {
      activa: true,
      dueno: { suscripcionHasta: { gt: new Date() }, eliminadoEn: null },
      ...(compatibles ? { deporteId: { in: compatibles } } : {}),
    },
    select: {
      id: true,
      nombre: true,
      direccion: true,
      telefono: true,
      ciudad: true,
      latitud: true,
      longitud: true,
      diasDisponibles: true,
      deporteId: true,
      deporte: { select: { nombre: true } },
    },
    take: 500,
  });

  const enCiudad = (ciudad: string | null) => Boolean(opciones.ciudad && ciudad === opciones.ciudad);
  return {
    canchas: canchas
      .filter((c) => !conTexto || normalizar(`${c.nombre} ${c.direccion} ${c.ciudad ?? ''}`).includes(buscado))
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        direccion: c.direccion,
        telefono: c.telefono,
        ciudad: c.ciudad,
        deporteId: c.deporteId,
        deporte: c.deporte.nombre,
        diasDisponibles: dias(c.diasDisponibles),
        km: kmHasta(opciones.desde, c),
      }))
      // Sin texto, solo lo cercano: a 50 km o en la misma ciudad.
      .filter((c) => conTexto || (c.km != null ? c.km <= 50 : enCiudad(c.ciudad)))
      .sort(
        (a, b) =>
          Number(b.deporteId === opciones.deporteId) - Number(a.deporteId === opciones.deporteId) ||
          (a.km ?? Infinity) - (b.km ?? Infinity)
      )
      .slice(0, MAXIMO),
  };
}
