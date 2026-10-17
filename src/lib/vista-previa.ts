import type { Metadata } from 'next';
import { prisma } from './db';
import { formatearPlata } from './formato';
import { HORAS_VOTACION, VOTOS_MINIMOS, contarVotos } from './figura';
import { sitioEnConstruccion } from './sitio';

/**
 * Lo que se ve al compartir un link de birteam (WhatsApp, Telegram, redes):
 * título, descripción y los textos de la imagen. Sale de los datos reales,
 * así la vista previa ya dice qué es, cuándo y cuántos faltan.
 */
export interface VistaPrevia {
  titulo: string;
  descripcion: string;
  /** Arriba, chico: "FÚTBOL 5 · PARTIDO". */
  rotulo: string;
  /** Grande: "JUEVES 21:00" o el nombre del torneo. */
  grande: string;
  /** Debajo: lugar, organizador, ciudad. */
  detalle: string;
  /** Lo que empuja a sumarse: "FALTAN 3", "QUEDAN 4 LUGARES". */
  destacado: string | null;
}

const ZONA = 'America/Argentina/Buenos_Aires';

export async function vistaPartido(token: string): Promise<VistaPrevia | null> {
  if (await sitioEnConstruccion()) return null;
  const partido = await prisma.partido.findUnique({
    where: { tokenPublico: token },
    include: {
      deporte: { select: { nombre: true } },
      organizador: { select: { nombre: true } },
      participaciones: { where: { estado: 'VOY' }, select: { id: true } },
      votosFigura: { select: { elegidoId: true } },
    },
  });
  if (!partido || partido.estado === 'CANCELADO') return null;
  const dia = partido.fecha.toLocaleDateString('es-AR', { weekday: 'long', timeZone: ZONA });
  const hora = partido.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA });
  const faltan = Math.max(0, partido.cupo - partido.participaciones.length);
  const jugado = partido.estado === 'JUGADO' || partido.fecha < new Date();
  const destacado = jugado
    ? null
    : partido.listaCerrada
      ? 'Lista cerrada'
      : faltan > 0
        ? `Faltan ${faltan}`
        : 'Completo · lista de espera';
  const lugar = [partido.lugarNombre, partido.ciudad].filter(Boolean).join(', ');

  // Ya jugado: lo que se comparte es cómo salió (resultado y figura).
  if (partido.estado === 'JUGADO') {
    const { ganadores, maximo } = contarVotos(partido.votosFigura);
    const votacionCerrada = Date.now() - partido.fecha.getTime() >= HORAS_VOTACION * 3600_000;
    const figuraId = votacionCerrada && maximo >= VOTOS_MINIMOS && ganadores.length === 1 ? ganadores[0] : null;
    const figura = figuraId
      ? await prisma.usuario.findUnique({ where: { id: figuraId }, select: { nombre: true, eliminadoEn: true } })
      : null;
    const nombreFigura = figura && !figura.eliminadoEn ? figura.nombre.split(' ')[0] : null;
    const cuenta = [partido.resultado ? `Terminó ${partido.resultado}` : 'Se jugó', nombreFigura ? `Figura: ${nombreFigura}` : null]
      .filter(Boolean)
      .join(' · ');
    return {
      titulo: `${partido.deporte.nombre} · ${dia} ${hora} · ${cuenta}`,
      descripcion: `${lugar ? `En ${lugar}. ` : ''}${partido.participaciones.length} jugadores. Organizó ${partido.organizador.nombre.split(' ')[0]}. Armá el próximo en birteam.`,
      rotulo: `${partido.deporte.nombre} · Jugado`,
      grande: partido.resultado ?? `${dia} ${hora}`,
      detalle: [lugar, nombreFigura ? `Figura: ${nombreFigura}` : null].filter(Boolean).join(' · '),
      destacado: null,
    };
  }

  return {
    titulo: `${partido.deporte.nombre} · ${dia} ${hora}${destacado && !jugado ? ` · ${destacado}` : ''}`,
    descripcion: `${lugar ? `En ${lugar}. ` : ''}Organiza ${partido.organizador.nombre.split(' ')[0]}.${
      partido.costoPorJugador ? ` ${formatearPlata(partido.costoPorJugador)} por jugador.` : ''
    } Sumate en birteam.`,
    rotulo: `${partido.deporte.nombre} · Partido`,
    grande: `${dia} ${hora}`,
    detalle: lugar,
    destacado,
  };
}

export async function vistaTorneo(token: string): Promise<VistaPrevia | null> {
  if (await sitioEnConstruccion()) return null;
  const torneo = await prisma.torneo.findUnique({
    where: { tokenPublico: token },
    include: { deporte: { select: { nombre: true } }, _count: { select: { equipos: true } } },
  });
  if (!torneo) return null;
  const lugares = Math.max(0, torneo.maxEquipos - torneo._count.equipos);
  const formato = torneo.formato === 'COPA' ? 'Copa' : 'Liga';
  const destacado =
    torneo.estado === 'INSCRIPCION'
      ? lugares > 0
        ? `Quedan ${lugares} lugares`
        : 'Cupo completo'
      : torneo.estado === 'EN_JUEGO'
        ? 'En juego'
        : 'Terminado';
  return {
    titulo: `${torneo.nombre} · ${formato} de ${torneo.deporte.nombre}`,
    descripcion: `${torneo._count.equipos}/${torneo.maxEquipos} equipos${torneo.ciudad ? ` · ${torneo.ciudad}` : ''}. ${
      torneo.estado === 'INSCRIPCION' ? 'Anotá a tu equipo en birteam.' : 'Seguí la tabla y los resultados en birteam.'
    }`,
    rotulo: `${torneo.deporte.nombre} · ${formato}`,
    grande: torneo.nombre,
    detalle: `${torneo._count.equipos} de ${torneo.maxEquipos} equipos${torneo.ciudad ? ` · ${torneo.ciudad}` : ''}`,
    destacado,
  };
}

export async function vistaGrupo(token: string): Promise<VistaPrevia | null> {
  if (await sitioEnConstruccion()) return null;
  const grupo = await prisma.grupo.findUnique({
    where: { tokenInvitacion: token },
    include: { deporte: { select: { nombre: true } }, _count: { select: { miembros: true } } },
  });
  if (!grupo) return null;
  const miembros = `${grupo._count.miembros} ${grupo._count.miembros === 1 ? 'miembro' : 'miembros'}`;
  return {
    titulo: `${grupo.nombre} · Grupo de ${grupo.deporte.nombre}`,
    descripcion: `${miembros}${grupo.ciudad ? ` · ${grupo.ciudad}` : ''}. Te invitaron: sumate en birteam y jugá con ellos.`,
    rotulo: `${grupo.deporte.nombre} · Grupo`,
    grande: grupo.nombre,
    detalle: `${miembros}${grupo.ciudad ? ` · ${grupo.ciudad}` : ''}`,
    destacado: 'Te invitaron',
  };
}

/**
 * Título y descripción de la página para los links compartidos. Sin datos
 * (link vencido, sitio en construcción) queda el título genérico.
 */
export function metadatosDe(vista: VistaPrevia | null, generico: string): Metadata {
  if (!vista) return { title: generico };
  return {
    title: vista.titulo,
    description: vista.descripcion,
    openGraph: { title: vista.titulo, description: vista.descripcion, siteName: 'birteam', locale: 'es_AR', type: 'website' },
    twitter: { card: 'summary_large_image', title: vista.titulo, description: vista.descripcion },
  };
}
