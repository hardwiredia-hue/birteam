import { prisma } from './db';
import { normalizar } from './normalizar';

/**
 * "Tus clientes": quiénes reservan en el complejo, cuánto vienen y cuándo
 * fue la última vez. Sale de los turnos confirmados (no de los bloqueos ni
 * de los pedidos que no se concretaron).
 */

/** Hasta dónde mirar para atrás. */
export const DIAS_CLIENTES = 180;
/** Sin venir en este tiempo, "hace rato que no viene". */
export const DIAS_SIN_VENIR = 30;

export interface Cliente {
  id: string;
  nombre: string;
  usuario: string;
  telefono: string | null;
  jugados: number;
  faltas: number;
  /** Turnos confirmados que vienen. */
  proximos: number;
  ultimaVez: Date | null;
  /** Lo que sumaron sus turnos jugados (precio del turno). */
  gastado: number;
  /** Tiene un turno fijo activo en el complejo. */
  fijo: boolean;
}

export async function clientesDelComplejo(duenoId: string, opciones: { q?: string | null; ahora?: Date } = {}) {
  const ahora = opciones.ahora ?? new Date();
  const desde = new Date(ahora.getTime() - DIAS_CLIENTES * 86400_000);
  // El dueño y sus empleados no son clientes (bloqueos, reservas de prueba).
  const equipo = await prisma.empleadoComplejo.findMany({ where: { duenoId }, select: { usuarioId: true } });
  const excluidos = [duenoId, ...equipo.map((e) => e.usuarioId)];

  const [reservas, fijos] = await Promise.all([
    prisma.reserva.findMany({
      where: {
        cancha: { duenoId },
        estado: 'CONFIRMADA',
        inicio: { gte: desde },
        usuarioId: { notIn: excluidos },
        usuario: { eliminadoEn: null },
      },
      select: {
        inicio: true,
        precio: true,
        noVino: true,
        usuario: { select: { id: true, nombre: true, usuario: true, telefono: true } },
      },
    }),
    prisma.turnoFijo.findMany({
      where: { cancha: { duenoId }, activo: true, usuarioId: { not: null } },
      select: { usuarioId: true },
    }),
  ]);
  const conFijo = new Set(fijos.map((f) => f.usuarioId));

  const porUsuario = new Map<string, Cliente>();
  for (const reserva of reservas) {
    const u = reserva.usuario;
    const cliente =
      porUsuario.get(u.id) ??
      ({
        id: u.id,
        nombre: u.nombre,
        usuario: u.usuario,
        telefono: u.telefono,
        jugados: 0,
        faltas: 0,
        proximos: 0,
        ultimaVez: null,
        gastado: 0,
        fijo: conFijo.has(u.id),
      } satisfies Cliente);
    if (reserva.inicio > ahora) {
      cliente.proximos++;
    } else if (reserva.noVino) {
      cliente.faltas++;
    } else {
      cliente.jugados++;
      cliente.gastado += reserva.precio ?? 0;
      if (!cliente.ultimaVez || reserva.inicio > cliente.ultimaVez) cliente.ultimaVez = reserva.inicio;
    }
    porUsuario.set(u.id, cliente);
  }

  const buscado = opciones.q ? normalizar(opciones.q) : '';
  return [...porUsuario.values()]
    .filter((c) => !buscado || normalizar(`${c.nombre} ${c.usuario}`).includes(buscado))
    .sort(
      (a, b) =>
        b.jugados - a.jugados ||
        b.proximos - a.proximos ||
        (b.ultimaVez?.getTime() ?? 0) - (a.ultimaVez?.getTime() ?? 0)
    );
}

/** Vino seguido y hace rato que no aparece (ni tiene turno): vale escribirle. */
export function haceRatoQueNoViene(cliente: Cliente, ahora = new Date()) {
  return (
    cliente.jugados >= 2 &&
    cliente.proximos === 0 &&
    cliente.ultimaVez != null &&
    ahora.getTime() - cliente.ultimaVez.getTime() > DIAS_SIN_VENIR * 86400_000
  );
}
