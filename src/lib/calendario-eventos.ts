import { prisma } from './db';
import { gestionaCancha } from './gestion';
import { sitioPublico } from './publico';
import { inicioDelTurno, proximosDias, diaDeSemana } from './reservas';
import { rotuloFijo } from './turnos-fijos';
import type { EventoCalendario } from './calendario';

export type TipoEvento = 'partido' | 'reserva' | 'fijo';

const lugarDe = (nombre: string, direccion: string | null) => (direccion ? `${nombre}, ${direccion}` : nombre);

/**
 * El evento de calendario de un partido, un turno o un turno fijo, solo si
 * el usuario tiene que ver con él (lo juega, lo organiza o lo gestiona).
 */
export async function eventoDe(tipo: TipoEvento, id: string, usuarioId: string): Promise<EventoCalendario | null> {
  const base = sitioPublico();

  if (tipo === 'partido') {
    const partido = await prisma.partido.findUnique({
      where: { id },
      include: {
        deporte: { select: { nombre: true } },
        participaciones: { where: { usuarioId }, select: { id: true } },
      },
    });
    if (!partido || partido.estado === 'CANCELADO') return null;
    const participa =
      partido.organizadorId === usuarioId ||
      partido.coOrganizadorId === usuarioId ||
      partido.participaciones.length > 0 ||
      partido.visibilidad === 'ABIERTO';
    if (!participa) return null;
    return {
      uid: `partido-${partido.id}`,
      titulo: `${partido.deporte.nombre} · ${partido.lugarNombre}`,
      inicio: partido.fecha,
      minutos: partido.duracionMin,
      lugar: lugarDe(partido.lugarNombre, partido.direccion),
      descripcion: 'Partido armado en birteam.',
      url: `${base}/partidos/${partido.id}`,
      semanal: partido.recurrenteSemanal,
    };
  }

  if (tipo === 'reserva') {
    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: { cancha: { select: { id: true, nombre: true, direccion: true, telefono: true, duenoId: true } } },
    });
    if (!reserva || reserva.estado !== 'CONFIRMADA') return null;
    if (reserva.usuarioId !== usuarioId && !(await gestionaCancha(usuarioId, reserva.cancha))) return null;
    return {
      uid: `reserva-${reserva.id}`,
      titulo: `Turno · ${reserva.cancha.nombre}`,
      inicio: reserva.inicio,
      minutos: reserva.duracion,
      lugar: lugarDe(reserva.cancha.nombre, reserva.cancha.direccion),
      descripcion: reserva.cancha.telefono ? `Teléfono del complejo: ${reserva.cancha.telefono}` : null,
      url: `${base}/reservas`,
    };
  }

  const fijo = await prisma.turnoFijo.findUnique({
    where: { id },
    include: { cancha: { select: { id: true, nombre: true, direccion: true, duenoId: true, duracionTurno: true } } },
  });
  if (!fijo || !fijo.activo) return null;
  if (fijo.usuarioId !== usuarioId && !(await gestionaCancha(usuarioId, fijo.cancha))) return null;
  // La primera semana que viene (desde que rige).
  const primera = proximosDias(8).find((fecha) => diaDeSemana(fecha) === fijo.diaSemana && fecha >= fijo.desde);
  if (!primera) return null;
  return {
    uid: `fijo-${fijo.id}`,
    titulo: `Turno fijo · ${fijo.cancha.nombre}`,
    inicio: inicioDelTurno(primera, fijo.hora),
    minutos: fijo.cancha.duracionTurno,
    lugar: lugarDe(fijo.cancha.nombre, fijo.cancha.direccion),
    descripcion: `Todos los ${rotuloFijo(fijo).toLowerCase()}. Si una semana no van, avisá desde birteam.`,
    url: `${base}/reservas`,
    semanal: true,
  };
}
