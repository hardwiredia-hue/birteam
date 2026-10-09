import { prisma } from './db';
import { enviarPush } from './push';

/**
 * Turnos de cancha. Todo se calcula en horario argentino (sin horario de
 * verano desde 2009, así que el desfase es fijo: -03:00).
 */

export const ZONA = 'America/Argentina/Buenos_Aires';
/** Cuántos días para adelante se puede reservar. */
export const DIAS_RESERVABLES = 14;
/** Una solicitud sin respuesta del dueño vence a las 12 h (o al empezar el turno). */
export const HORAS_RESPUESTA = 12;
/** El jugador cancela una reserva confirmada hasta 6 h antes; después, hablando con el complejo. */
export const HORAS_CANCELACION = 6;
/** No se piden turnos que arrancan en menos de 30 minutos: para eso, el teléfono. */
export const MINUTOS_ANTICIPACION = 30;
export const DURACIONES = [60, 90, 120] as const;

/** Estados que ocupan el turno. */
export const ESTADOS_ACTIVOS = ['SOLICITADA', 'CONFIRMADA', 'BLOQUEO'];

export const ROTULOS_ESTADO: Record<string, string> = {
  SOLICITADA: 'Esperando confirmación',
  CONFIRMADA: 'Confirmada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
  VENCIDA: 'Vencida sin respuesta',
  BLOQUEO: 'Bloqueado por el complejo',
};

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-10-09" del instante dado, en hora argentina. */
export function claveDia(instante = new Date()) {
  return instante.toLocaleDateString('en-CA', { timeZone: ZONA });
}

/** 0=domingo … 6=sábado de una clave de día (sin depender de la zona del servidor). */
export function diaDeSemana(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
}

/** El instante en que arranca el turno. */
export function inicioDelTurno(fecha: string, hora: string) {
  return new Date(`${fecha}T${hora}:00-03:00`);
}

/** Las claves de los próximos `cantidad` días, arrancando hoy. */
export function proximosDias(cantidad = DIAS_RESERVABLES, desde = new Date()) {
  const hoy = claveDia(desde);
  const [anio, mes, dia] = hoy.split('-').map(Number);
  return Array.from({ length: cantidad }, (_, indice) => {
    const fecha = new Date(Date.UTC(anio, mes - 1, dia + indice));
    return fecha.toISOString().slice(0, 10);
  });
}

/** "Vie 9 oct" */
export function rotuloDia(fecha: string) {
  const [, mes, dia] = fecha.split('-').map(Number);
  return `${DIAS_CORTOS[diaDeSemana(fecha)]} ${dia} ${MESES_CORTOS[mes - 1]}`;
}

/** Los horarios de inicio de los turnos de un día, según la gestión de la cancha. */
export function horariosDelDia(cancha: {
  horaApertura: number;
  horaCierre: number;
  duracionTurno: number;
}) {
  const horarios: string[] = [];
  const duracion = Math.max(30, cancha.duracionTurno);
  for (let minuto = cancha.horaApertura * 60; minuto + duracion <= cancha.horaCierre * 60; minuto += duracion) {
    const horas = String(Math.floor(minuto / 60)).padStart(2, '0');
    const minutos = String(minuto % 60).padStart(2, '0');
    horarios.push(`${horas}:${minutos}`);
  }
  return horarios;
}

export function diasDeLaCancha(crudo: string): number[] {
  try {
    const dias = JSON.parse(crudo);
    return Array.isArray(dias) ? dias : [0, 1, 2, 3, 4, 5, 6];
  } catch {
    return [0, 1, 2, 3, 4, 5, 6];
  }
}

export function claveOcupa(canchaId: string, fecha: string, hora: string) {
  return `${canchaId}|${fecha}|${hora}`;
}

/** Precio del turno: el de la hora, proporcional a la duración. */
export function precioDelTurno(precioPorHora: number | null, duracion: number) {
  return precioPorHora != null ? Math.round((precioPorHora * duracion) / 60) : null;
}

/** ¿Se superponen dos turnos? (inicio en ms, duración en minutos) */
export function seSuperponen(inicioA: number, duracionA: number, inicioB: number, duracionB: number) {
  return inicioA < inicioB + duracionB * 60_000 && inicioB < inicioA + duracionA * 60_000;
}

/**
 * Las solicitudes que el dueño no contestó a tiempo vencen y liberan el turno.
 * Se llama antes de mostrar o pedir turnos (y desde las tareas programadas),
 * así nunca queda un turno trabado por una solicitud olvidada.
 */
export async function liberarVencidas(canchaId?: string) {
  const vencidas = await prisma.reserva.findMany({
    where: {
      estado: 'SOLICITADA',
      venceEn: { lt: new Date() },
      ...(canchaId ? { canchaId } : {}),
    },
    include: { cancha: { select: { id: true, nombre: true } } },
  });
  for (const reserva of vencidas) {
    const { count } = await prisma.reserva.updateMany({
      where: { id: reserva.id, estado: 'SOLICITADA' },
      data: { estado: 'VENCIDA', ocupa: null },
    });
    if (count === 0) continue;
    const titulo = 'Tu pedido de turno venció';
    const cuerpo = `${reserva.cancha.nombre} no respondió a tiempo el turno del ${rotuloDia(reserva.fecha)} a las ${reserva.hora}. Probá otro horario o llamalos.`;
    await prisma.notificacion.create({
      data: {
        usuarioId: reserva.usuarioId,
        tipo: 'RESERVA_VENCIDA',
        titulo,
        cuerpo,
        url: `/canchas/${reserva.cancha.id}`,
      },
    });
    await enviarPush(reserva.usuarioId, { titulo, cuerpo, url: `/canchas/${reserva.cancha.id}` });
  }
  return vencidas.length;
}

export interface TurnoDeGrilla {
  hora: string;
  /** LIBRE · OCUPADO · PASADO · MIA (con estadoMio) */
  estado: 'LIBRE' | 'OCUPADO' | 'PASADO' | 'MIA';
  estadoMio?: string;
  reservaId?: string;
  /** Solo para el dueño: quién lo tiene y en qué estado. */
  detalle?: { estado: string; nombre: string; usuario: string; nota: string | null };
}

export interface DiaDeGrilla {
  fecha: string;
  rotulo: string;
  abierto: boolean;
  turnos: TurnoDeGrilla[];
}

/** La grilla de turnos de los próximos días, vista por un usuario (dueño o jugador). */
export async function grillaDeTurnos(
  cancha: {
    id: string;
    duenoId: string;
    diasDisponibles: string;
    horaApertura: number;
    horaCierre: number;
    duracionTurno: number;
  },
  usuarioId: string
): Promise<DiaDeGrilla[]> {
  await liberarVencidas(cancha.id);
  const dias = proximosDias();
  const esDueno = cancha.duenoId === usuarioId;
  const abiertos = diasDeLaCancha(cancha.diasDisponibles);
  const horarios = horariosDelDia(cancha);
  const limite = Date.now() + MINUTOS_ANTICIPACION * 60_000;

  const reservas = await prisma.reserva.findMany({
    where: { canchaId: cancha.id, fecha: { in: dias }, estado: { in: ESTADOS_ACTIVOS } },
    include: { usuario: { select: { nombre: true, usuario: true } } },
  });

  return dias.map((fecha) => {
    const abierto = abiertos.includes(diaDeSemana(fecha));
    const delDia = reservas.filter((reserva) => reserva.fecha === fecha);
    const turnos: TurnoDeGrilla[] = abierto
      ? horarios.map((hora) => {
          const inicio = inicioDelTurno(fecha, hora).getTime();
          const tomada = delDia.find((reserva) =>
            seSuperponen(inicio, cancha.duracionTurno, reserva.inicio.getTime(), reserva.duracion)
          );
          if (tomada && tomada.usuarioId === usuarioId && !esDueno) {
            return { hora, estado: 'MIA', estadoMio: tomada.estado, reservaId: tomada.id };
          }
          if (tomada) {
            return {
              hora,
              estado: 'OCUPADO',
              ...(esDueno
                ? {
                    reservaId: tomada.id,
                    detalle: {
                      estado: tomada.estado,
                      nombre: tomada.usuario.nombre,
                      usuario: tomada.usuario.usuario,
                      nota: tomada.nota,
                    },
                  }
                : {}),
            };
          }
          if (inicio < limite) return { hora, estado: 'PASADO' };
          return { hora, estado: 'LIBRE' };
        })
      : [];
    return { fecha, rotulo: rotuloDia(fecha), abierto, turnos };
  });
}

/** Aviso en la campanita + push, en un solo paso. */
export async function avisarReserva(
  usuarioId: string,
  tipo: string,
  titulo: string,
  cuerpo: string,
  url: string
) {
  await prisma.notificacion.create({ data: { usuarioId, tipo, titulo, cuerpo, url } });
  await enviarPush(usuarioId, { titulo, cuerpo, url });
}
