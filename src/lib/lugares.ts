import { prisma } from './db';
import { normalizar } from './normalizar';
import { coordenadasDelLugar } from './coordenadas';
import { kmHasta, type Punto } from './ubicacion';

/**
 * Dónde se juega: canchas publicadas por sus dueños y lugares que carga la
 * comunidad al crear partidos. Lo que alguien escribe una vez queda para
 * que cualquiera lo elija después, sin repetirlo.
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

export interface LugarParaElegir {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
  usos: number;
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

const porCercania = <T extends { km: number | null }>(a: T, b: T) => (a.km ?? Infinity) - (b.km ?? Infinity);

/**
 * Canchas y lugares para el paso "¿Dónde juegan?". Sin texto: los más cerca
 * (canchas del deporte elegido). Con texto: los que coinciden, sin importar
 * tildes ni mayúsculas.
 */
export async function buscarDonde(opciones: {
  q?: string | null;
  deporteId?: string | null;
  desde: Punto | null;
  ciudad?: string | null;
}): Promise<{ canchas: CanchaParaElegir[]; lugares: LugarParaElegir[] }> {
  const buscado = opciones.q ? normalizar(opciones.q) : '';
  const conTexto = buscado.length >= 2;

  const [canchas, lugares] = await Promise.all([
    prisma.cancha.findMany({
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
    }),
    prisma.lugar.findMany({
      where: conTexto ? { nombreNorm: { contains: buscado } } : {},
      orderBy: { usos: 'desc' },
      take: conTexto ? 50 : 200,
    }),
  ]);

  const enCiudad = (ciudad: string | null) => Boolean(opciones.ciudad && ciudad === opciones.ciudad);
  const canchasElegibles = canchas
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
    .sort((a, b) => Number(b.deporteId === opciones.deporteId) - Number(a.deporteId === opciones.deporteId) || porCercania(a, b))
    .slice(0, MAXIMO);

  const lugaresElegibles = lugares
    .map((l) => ({
      id: l.id,
      nombre: l.nombre,
      direccion: l.direccion,
      telefono: l.telefono,
      ciudad: l.ciudad,
      usos: l.usos,
      km: kmHasta(opciones.desde, l),
    }))
    .filter((l) => conTexto || (l.km != null ? l.km <= 50 : enCiudad(l.ciudad)))
    .sort((a, b) => porCercania(a, b) || b.usos - a.usos)
    .slice(0, MAXIMO);

  return { canchas: canchasElegibles, lugares: lugaresElegibles };
}

/**
 * El lugar de un partido que no es una cancha publicada: el elegido de la
 * lista, o uno con ese nombre en esa ciudad, o uno nuevo. Completa lo que
 * le faltaba (dirección, teléfono) sin pisar lo que ya tenía.
 */
export async function lugarParaPartido(datos: {
  lugarId?: string | null;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  creadorId: string;
}) {
  const nombreNorm = normalizar(datos.nombre);
  const existente =
    (datos.lugarId ? await prisma.lugar.findUnique({ where: { id: datos.lugarId } }) : null) ??
    (await prisma.lugar.findFirst({
      where: { nombreNorm, ciudad: datos.ciudad ?? null },
      orderBy: { usos: 'desc' },
    }));

  if (existente) {
    return prisma.lugar.update({
      where: { id: existente.id },
      data: {
        usos: { increment: 1 },
        ...(existente.direccion ? {} : { direccion: datos.direccion || null }),
        ...(existente.telefono ? {} : { telefono: datos.telefono || null }),
      },
    });
  }

  const coordenadas = await coordenadasDelLugar({ ciudad: datos.ciudad, provincia: datos.provincia });
  return prisma.lugar.create({
    data: {
      nombre: datos.nombre.trim(),
      nombreNorm,
      direccion: datos.direccion || null,
      telefono: datos.telefono || null,
      ciudad: datos.ciudad ?? null,
      provincia: datos.provincia ?? null,
      latitud: coordenadas?.latitud ?? null,
      longitud: coordenadas?.longitud ?? null,
      creadorId: datos.creadorId,
      usos: 1,
    },
  });
}
