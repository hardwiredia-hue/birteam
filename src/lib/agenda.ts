import { prisma } from './db';

/**
 * La agenda del complejo para un día: todos los turnos tomados de todas las
 * canchas, por hora. Lo que mira el encargado al llegar: quién juega, dónde,
 * si está confirmado o falta responder, si pagó y cómo contactarlo.
 */

export type EstadoAgenda = 'PEDIDO' | 'ESPERANDO_PAGO' | 'CONFIRMADO' | 'FIJO' | 'BLOQUEADO';

export interface TurnoAgenda {
  id: string;
  hora: string;
  hasta: string;
  inicio: Date;
  canchaId: string;
  cancha: string;
  /** Quién juega (o el motivo del bloqueo). */
  quien: string;
  usuario: string | null;
  estado: EstadoAgenda;
  precio: number | null;
  /** Lo pagado online (si cobra por Mercado Pago y ya se acreditó). */
  pagadoOnline: number | null;
  telefono: string | null;
  nota: string | null;
}

function sumarMinutos(hora: string, minutos: number) {
  const total = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)) + minutos;
  const h = Math.floor(total / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export async function agendaDelDia(duenoIds: string[], fecha: string): Promise<TurnoAgenda[]> {
  const reservas = await prisma.reserva.findMany({
    where: {
      fecha,
      cancha: { duenoId: { in: duenoIds } },
      estado: { in: ['SOLICITADA', 'PENDIENTE_PAGO', 'CONFIRMADA', 'BLOQUEO'] },
    },
    include: {
      cancha: { select: { id: true, nombre: true } },
      usuario: { select: { nombre: true, usuario: true, telefono: true } },
      turnoFijo: { select: { titular: true, telefono: true } },
    },
    orderBy: [{ inicio: 'asc' }, { cancha: { nombre: 'asc' } }],
  });

  return reservas.map((r) => {
    const estado: EstadoAgenda =
      r.estado === 'BLOQUEO'
        ? 'BLOQUEADO'
        : r.estado === 'SOLICITADA'
          ? 'PEDIDO'
          : r.estado === 'PENDIENTE_PAGO'
            ? 'ESPERANDO_PAGO'
            : r.turnoFijoId
              ? 'FIJO'
              : 'CONFIRMADO';
    const quien =
      estado === 'BLOQUEADO'
        ? r.nota || r.turnoFijo?.titular || 'Bloqueado'
        : (r.turnoFijo?.titular ?? r.usuario.nombre);
    return {
      id: r.id,
      hora: r.hora,
      hasta: sumarMinutos(r.hora, r.duracion),
      inicio: r.inicio,
      canchaId: r.cancha.id,
      cancha: r.cancha.nombre,
      quien,
      usuario: estado === 'BLOQUEADO' ? null : r.usuario.usuario,
      estado,
      precio: r.precio,
      pagadoOnline: r.pagoEstado === 'APROBADO' ? r.montoOnline : null,
      telefono: r.turnoFijo?.telefono ?? (estado === 'BLOQUEADO' ? null : r.usuario.telefono),
      nota: estado === 'BLOQUEADO' ? null : r.nota,
    };
  });
}

/** Link de WhatsApp para un teléfono argentino escrito como sea. */
export function enlaceWhatsApp(telefono: string) {
  let digitos = telefono.replace(/\D/g, '');
  if (digitos.startsWith('0')) digitos = digitos.slice(1);
  if (!digitos.startsWith('54')) digitos = `54${digitos}`;
  return `https://wa.me/${digitos}`;
}
