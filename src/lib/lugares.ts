import { prisma } from './db';
import { normalizar } from './normalizar';
import { kmHasta, type Punto } from './ubicacion';

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
 * Sin texto: las canchas cercanas (las del deporte elegido primero). Con
 * texto: las que coinciden por nombre, dirección o ciudad, sin importar
 * tildes ni mayúsculas.
 */
export async function buscarDonde(opciones: {
  q?: string | null;
  deporteId?: string | null;
  desde: Punto | null;
  ciudad?: string | null;
}): Promise<{ canchas: CanchaParaElegir[] }> {
  const buscado = opciones.q ? normalizar(opciones.q) : '';
  const conTexto = buscado.length >= 2;

  const canchas = await prisma.cancha.findMany({
    where: {
      activa: true,
      dueno: { suscripcionHasta: { gt: new Date() }, eliminadoEn: null },
      ...(!conTexto && opciones.deporteId ? { deporteId: opciones.deporteId } : {}),
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
