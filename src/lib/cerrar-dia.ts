import { Prisma } from '@prisma/client';
import { prisma } from './db';
import {
  DIAS_RESERVABLES,
  ESTADOS_ACTIVOS,
  claveOcupa,
  diaDeSemana,
  diasDeLaCancha,
  horariosDelDia,
  inicioDelTurno,
  proximosDias,
} from './reservas';
import { materializarFijos } from './turnos-fijos';

/**
 * "Cerrar el día" (feriado, mantenimiento, un evento): bloquea de una todos
 * los turnos libres de ese día. Lo ya reservado no se toca: se lista para
 * que el complejo avise o cancele uno por uno (con su devolución, si pagó).
 */

import { type MotivoCierre } from './cerrar-dia-comun';

export { MOTIVOS_CIERRE, type MotivoCierre } from './cerrar-dia-comun';

/** Así se reconocen los bloqueos del cierre (y no los que se hicieron a mano). */
export const PREFIJO_CIERRE = 'Día cerrado';

export const notaDeCierre = (motivo: MotivoCierre) => `${PREFIJO_CIERRE}: ${motivo}`;

interface CanchaParaCerrar {
  id: string;
  nombre: string;
  horaApertura: number;
  horaCierre: number;
  duracionTurno: number;
  diasDisponibles: string;
}

/** El día tiene que ser uno de los que se pueden reservar (hoy en adelante). */
export function diaCerrable(fecha: string, ahora = new Date()) {
  return proximosDias(DIAS_RESERVABLES, ahora).includes(fecha);
}

export async function cerrarDia(opciones: {
  canchas: CanchaParaCerrar[];
  fecha: string;
  motivo: MotivoCierre;
  usuarioId: string;
  ahora?: Date;
}) {
  const ahora = opciones.ahora ?? new Date();
  const nota = notaDeCierre(opciones.motivo);
  let bloqueados = 0;

  for (const cancha of opciones.canchas) {
    if (!diasDeLaCancha(cancha.diasDisponibles).includes(diaDeSemana(opciones.fecha))) continue;
    // Los turnos fijos de ese día, ya cargados como reservas (así no se pisan).
    await materializarFijos(cancha.id);
    const horas: string[] = [];
    for (const hora of horariosDelDia(cancha)) {
      const inicio = inicioDelTurno(opciones.fecha, hora);
      if (inicio <= ahora) continue;
      try {
        await prisma.reserva.create({
          data: {
            canchaId: cancha.id,
            usuarioId: opciones.usuarioId,
            fecha: opciones.fecha,
            hora,
            inicio,
            duracion: cancha.duracionTurno,
            estado: 'BLOQUEO',
            nota,
            ocupa: claveOcupa(cancha.id, opciones.fecha, hora),
          },
        });
        horas.push(hora);
      } catch (error) {
        // Ya tomado (reserva, pedido o bloqueo): queda como está.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
        throw error;
      }
    }
    bloqueados += horas.length;
    // Un turno cerrado no puede seguir en el Radar.
    if (horas.length > 0) {
      await prisma.ofertaTurno.deleteMany({ where: { canchaId: cancha.id, fecha: opciones.fecha, hora: { in: horas } } });
    }
  }

  const reservadas = await prisma.reserva.findMany({
    where: {
      canchaId: { in: opciones.canchas.map((c) => c.id) },
      fecha: opciones.fecha,
      estado: { in: ESTADOS_ACTIVOS.filter((e) => e !== 'BLOQUEO') },
      inicio: { gt: ahora },
    },
    include: {
      cancha: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
      turnoFijo: { select: { titular: true } },
    },
    orderBy: [{ hora: 'asc' }],
  });

  return {
    bloqueados,
    reservadas: reservadas.map((r) => ({
      id: r.id,
      cancha: r.cancha.nombre,
      hora: r.hora,
      quien: r.turnoFijo?.titular ?? r.usuario.nombre,
      estado: r.estado,
    })),
  };
}

/** Deshacer el cierre: saca solo los bloqueos que puso "Cerrar el día". */
export async function abrirDia(canchaIds: string[], fecha: string) {
  const { count } = await prisma.reserva.updateMany({
    where: { canchaId: { in: canchaIds }, fecha, estado: 'BLOQUEO', nota: { startsWith: PREFIJO_CIERRE } },
    data: { estado: 'CANCELADA', ocupa: null },
  });
  return count;
}

/** Los días cerrados que vienen, con su motivo (para mostrarlos y poder abrirlos). */
export async function diasCerrados(canchaId: string, ahora = new Date()) {
  const bloqueos = await prisma.reserva.findMany({
    where: {
      canchaId,
      estado: 'BLOQUEO',
      nota: { startsWith: PREFIJO_CIERRE },
      fecha: { in: proximosDias(DIAS_RESERVABLES, ahora) },
    },
    select: { fecha: true, nota: true },
    distinct: ['fecha'],
    orderBy: { fecha: 'asc' },
  });
  return bloqueos.map((b) => ({ fecha: b.fecha, motivo: (b.nota ?? '').replace(`${PREFIJO_CIERRE}: `, '') }));
}
