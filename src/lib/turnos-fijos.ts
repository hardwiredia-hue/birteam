import { Prisma } from '@prisma/client';
import { prisma } from './db';
import {
  ESTADOS_ACTIVOS,
  avisarAlComplejo,
  avisarReserva,
  claveDia,
  claveOcupa,
  diaDeSemana,
  diasDeLaCancha,
  horariosDelDia,
  inicioDelTurno,
  liberarVencidas,
  precioDelTurnoEn,
  proximosDias,
  rotuloDia,
  seSuperponen,
} from './reservas';
import { avisarTurnoLibre } from './alertas-turno';

/**
 * Turnos fijos: el mismo día y horario todas las semanas. No se guardan
 * como una regla aparte que haya que consultar en cada grilla: se generan
 * reservas reales semana a semana dentro de los días reservables, así el
 * turno queda tomado con la misma clave única que cualquier reserva.
 *
 * - Con jugador de birteam: reserva CONFIRMADA a su nombre (la ve en
 *   Reservas y puede avisar que una semana no va).
 * - Sin jugador: BLOQUEO del complejo con el nombre del titular.
 * - Una semana cancelada no se vuelve a generar (único turnoFijo + fecha).
 * - Si esa semana el turno ya estaba tomado, se deja constancia y se avisa
 *   al complejo una sola vez.
 */

export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
/** Turnos fijos activos que puede tener una cancha (uno por horario y día). */
export const MAXIMO_FIJOS_POR_CANCHA = 60;

export function notaDelFijo(titular: string) {
  return `Turno fijo · ${titular}`;
}

/** "Martes 21:00" */
export function rotuloFijo(fijo: { diaSemana: number; hora: string }) {
  return `${DIAS_SEMANA[fijo.diaSemana]} ${fijo.hora}`;
}

/** Fechas en que corresponde el turno dentro de los días reservables (desde ahora). */
export function fechasDelFijo(
  fijo: { diaSemana: number; hora: string; desde: string },
  cancha: { diasDisponibles: string; horaApertura: number; horaCierre: number; duracionTurno: number },
  ahora = new Date()
) {
  // Si la cancha cambió días u horario, esa semana el turno no existe.
  if (!diasDeLaCancha(cancha.diasDisponibles).includes(fijo.diaSemana)) return [];
  if (!horariosDelDia(cancha).includes(fijo.hora)) return [];
  return proximosDias(undefined, ahora).filter(
    (fecha) =>
      diaDeSemana(fecha) === fijo.diaSemana &&
      fecha >= fijo.desde &&
      inicioDelTurno(fecha, fijo.hora).getTime() > ahora.getTime()
  );
}

/**
 * Genera las semanas que falten de los turnos fijos activos. Idempotente:
 * se llama antes de mostrar o pedir turnos (desde liberarVencidas).
 */
export async function materializarFijos(canchaId?: string, opciones: { sinAvisoDe?: string } = {}) {
  const fijos = await prisma.turnoFijo.findMany({
    where: { activo: true, ...(canchaId ? { canchaId } : {}) },
    include: { cancha: true },
  });
  if (fijos.length === 0) return 0;

  const ahora = new Date();
  const pendientes = fijos.flatMap((fijo) =>
    fechasDelFijo(fijo, fijo.cancha, ahora).map((fecha) => ({ fijo, fecha }))
  );
  if (pendientes.length === 0) return 0;

  const existentes = await prisma.reserva.findMany({
    where: {
      turnoFijoId: { in: fijos.map((f) => f.id) },
      fecha: { in: [...new Set(pendientes.map((p) => p.fecha))] },
    },
    select: { turnoFijoId: true, fecha: true },
  });
  const hechas = new Set(existentes.map((r) => `${r.turnoFijoId}|${r.fecha}`));
  const faltan = pendientes.filter(({ fijo, fecha }) => !hechas.has(`${fijo.id}|${fecha}`));

  let creadas = 0;
  for (const { fijo, fecha } of faltan) {
    const { cancha } = fijo;
    const inicio = inicioDelTurno(fecha, fijo.hora);
    const datos = {
      canchaId: cancha.id,
      fecha,
      hora: fijo.hora,
      inicio,
      duracion: cancha.duracionTurno,
      turnoFijoId: fijo.id,
      nota: fijo.usuarioId ? null : notaDelFijo(fijo.titular),
    };

    // ¿Lo pisa otro turno ese día? (también los de otra duración)
    const delDia = await prisma.reserva.findMany({
      where: { canchaId: cancha.id, fecha, estado: { in: ESTADOS_ACTIVOS } },
      select: { inicio: true, duracion: true },
    });
    const ocupado = delDia.some((r) =>
      seSuperponen(inicio.getTime(), cancha.duracionTurno, r.inicio.getTime(), r.duracion)
    );

    try {
      if (ocupado) {
        // Constancia (no ocupa nada) para no volver a intentarlo ni avisar dos veces.
        await prisma.reserva.create({
          data: {
            ...datos,
            usuarioId: fijo.usuarioId ?? fijo.creadoPorId,
            estado: 'CANCELADA',
            motivo: 'El turno ya estaba tomado esa semana.',
          },
        });
        // Recién creado: el complejo ya ve los choques en pantalla.
        if (opciones.sinAvisoDe === fijo.id) continue;
        await avisarAlComplejo(
          cancha.duenoId,
          'TURNO_FIJO_CHOCA',
          `Turno fijo sin lugar · ${cancha.nombre}`,
          `El ${rotuloDia(fecha)} a las ${fijo.hora} ya estaba tomado, así que esa semana ${fijo.titular} no tiene su turno fijo. Avisales o movelos de horario.`,
          `/canchas/${cancha.id}?fecha=${fecha}&hora=${fijo.hora}`
        );
        continue;
      }
      await prisma.reserva.create({
        data: {
          ...datos,
          usuarioId: fijo.usuarioId ?? fijo.creadoPorId,
          estado: fijo.usuarioId ? 'CONFIRMADA' : 'BLOQUEO',
          precio: precioDelTurnoEn(cancha, fecha, fijo.hora),
          ocupa: claveOcupa(cancha.id, fecha, fijo.hora),
        },
      });
      creadas++;
    } catch (error) {
      // Otro pedido entró justo antes, o dos llamadas generaron la misma semana.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
      throw error;
    }
  }
  return creadas;
}

/**
 * Termina un turno fijo: no se generan más semanas y se liberan las que
 * todavía no empezaron. Avisa al jugador (si lo termina el complejo) o al
 * complejo (si lo deja el jugador).
 */
export async function terminarFijo(fijoId: string, quien: 'COMPLEJO' | 'JUGADOR') {
  const fijo = await prisma.turnoFijo.findUnique({
    where: { id: fijoId },
    include: { cancha: { select: { id: true, nombre: true, duenoId: true } } },
  });
  if (!fijo || !fijo.activo) return false;
  const { count } = await prisma.turnoFijo.updateMany({
    where: { id: fijo.id, activo: true },
    data: { activo: false, terminadoEn: new Date() },
  });
  if (count === 0) return false;

  const liberadas = await prisma.reserva.findMany({
    where: {
      turnoFijoId: fijo.id,
      estado: { in: ['CONFIRMADA', 'BLOQUEO'] },
      inicio: { gt: new Date() },
    },
    select: { id: true, fecha: true, hora: true },
  });
  await prisma.reserva.updateMany({
    where: { id: { in: liberadas.map((r) => r.id) }, estado: { in: ['CONFIRMADA', 'BLOQUEO'] } },
    data: { estado: 'CANCELADA', ocupa: null, motivo: 'Terminó el turno fijo.' },
  });
  for (const semana of liberadas) await avisarTurnoLibre(fijo.canchaId, semana.fecha, semana.hora);

  const rotulo = rotuloFijo(fijo);
  if (quien === 'COMPLEJO' && fijo.usuarioId) {
    await avisarReserva(
      fijo.usuarioId,
      'TURNO_FIJO_TERMINADO',
      `Terminó tu turno fijo · ${fijo.cancha.nombre}`,
      `El complejo dio de baja tu turno de los ${rotulo.toLowerCase()}. Si fue un error, hablá con ellos.`,
      `/canchas/${fijo.cancha.id}`
    );
  }
  if (quien === 'JUGADOR') {
    await avisarAlComplejo(
      fijo.cancha.duenoId,
      'TURNO_FIJO_TERMINADO',
      `Se liberó un turno fijo · ${fijo.cancha.nombre}`,
      `${fijo.titular} dejó su turno de los ${rotulo.toLowerCase()}. Desde ahora ese horario queda libre todas las semanas.`,
      `/canchas/${fijo.cancha.id}`
    );
  }
  return true;
}

/**
 * Arma un turno fijo: valida día, horario, que no esté tomado como fijo y
 * el tope por cancha; genera las semanas y avisa al jugador si es de
 * birteam. Lo usan el complejo al cargarlo y al aceptar un pedido.
 */
export async function armarTurnoFijo(
  cancha: { id: string; nombre: string; diasDisponibles: string; horaApertura: number; horaCierre: number; duracionTurno: number },
  creadorId: string,
  datos: {
    diaSemana: number;
    hora: string;
    titular: string;
    jugadorId: string | null;
    telefono?: string | null;
    nota?: string | null;
    desde?: string | null;
  }
): Promise<{ id: string; reservadas: string[]; tomadas: string[] } | { error: string; estado: number }> {
  const { diaSemana, hora } = datos;
  if (!diasDeLaCancha(cancha.diasDisponibles).includes(diaSemana)) return { error: 'La cancha no abre ese día.', estado: 400 };
  if (!horariosDelDia(cancha).includes(hora)) return { error: 'Ese horario no es un turno de la cancha.', estado: 400 };
  const hoy = claveDia();
  const desde = datos.desde && datos.desde > hoy ? datos.desde : hoy;

  const [repetido, cantidad] = await Promise.all([
    prisma.turnoFijo.findFirst({ where: { canchaId: cancha.id, diaSemana, hora, activo: true } }),
    prisma.turnoFijo.count({ where: { canchaId: cancha.id, activo: true } }),
  ]);
  if (repetido) return { error: `Ese horario ya es el turno fijo de ${repetido.titular}.`, estado: 409 };
  if (cantidad >= MAXIMO_FIJOS_POR_CANCHA) return { error: `Hasta ${MAXIMO_FIJOS_POR_CANCHA} turnos fijos por cancha.`, estado: 409 };

  await liberarVencidas(cancha.id);
  const fijo = await prisma.turnoFijo.create({
    data: {
      canchaId: cancha.id,
      diaSemana,
      hora,
      titular: datos.titular,
      usuarioId: datos.jugadorId,
      telefono: datos.telefono || null,
      nota: datos.nota || null,
      desde,
      creadoPorId: creadorId,
    },
  });
  await materializarFijos(cancha.id, { sinAvisoDe: fijo.id });

  const semanas = await prisma.reserva.findMany({
    where: { turnoFijoId: fijo.id },
    select: { fecha: true, estado: true },
    orderBy: { fecha: 'asc' },
  });
  if (datos.jugadorId && datos.jugadorId !== creadorId) {
    await avisarReserva(
      datos.jugadorId,
      'TURNO_FIJO',
      `Tenés turno fijo · ${cancha.nombre}`,
      `Te anotaron los ${rotuloFijo(fijo).toLowerCase()} todas las semanas. Si una semana no van, cancelala desde Reservas con tiempo.`,
      '/reservas'
    );
  }
  return {
    id: fijo.id,
    reservadas: semanas.filter((s) => s.estado !== 'CANCELADA').map((s) => s.fecha),
    tomadas: semanas.filter((s) => s.estado === 'CANCELADA').map((s) => s.fecha),
  };
}
