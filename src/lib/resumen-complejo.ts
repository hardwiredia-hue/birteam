import { prisma } from './db';
import { enviarPush } from './push';
import { claveDia } from './reservas';

/**
 * El resumen de la mañana para cada complejo: cuántos turnos confirmados
 * hay hoy y cuántos pedidos esperan respuesta. Una vez por día, entre las
 * 8 y las 11 (hora argentina), y solo si hay algo para contar.
 */

const ZONA = 'America/Argentina/Buenos_Aires';
const DESDE_HORA = 8;
const HASTA_HORA = 11;

export function esHoraDelResumen(ahora = new Date()) {
  const hora = Number(ahora.toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false, timeZone: ZONA }));
  return hora >= DESDE_HORA && hora < HASTA_HORA;
}

export async function resumenDeLaManana(ahora = new Date()) {
  if (!esHoraDelResumen(ahora)) return 0;
  const hoy = claveDia(ahora);
  const inicioDelDia = new Date(`${hoy}T00:00:00-03:00`);

  const duenos = await prisma.usuario.findMany({
    where: {
      tipoCuenta: 'CANCHA',
      eliminadoEn: null,
      suscripcionHasta: { gt: ahora },
      canchas: { some: { activa: true } },
      // Ya le llegó el de hoy.
      notificaciones: { none: { tipo: 'RESUMEN_DIA', creadoEn: { gte: inicioDelDia } } },
    },
    select: { id: true },
  });

  let enviados = 0;
  for (const dueno of duenos) {
    const [confirmados, pedidos] = await Promise.all([
      prisma.reserva.count({ where: { cancha: { duenoId: dueno.id }, fecha: hoy, estado: 'CONFIRMADA' } }),
      prisma.reserva.count({ where: { cancha: { duenoId: dueno.id }, estado: 'SOLICITADA', inicio: { gt: ahora } } }),
    ]);
    if (confirmados === 0 && pedidos === 0) continue;
    const partes = [
      confirmados > 0 ? `${confirmados} ${confirmados === 1 ? 'turno confirmado' : 'turnos confirmados'} hoy` : 'Hoy no hay turnos confirmados',
      pedidos > 0 ? `${pedidos} ${pedidos === 1 ? 'pedido espera' : 'pedidos esperan'} tu respuesta` : null,
    ].filter(Boolean);
    const titulo = 'Tu día en el complejo';
    const cuerpo = `${partes.join(' · ')}.`;
    await prisma.notificacion.create({ data: { usuarioId: dueno.id, tipo: 'RESUMEN_DIA', titulo, cuerpo, url: '/complejo' } });
    await enviarPush(dueno.id, { titulo, cuerpo, url: '/complejo' });
    enviados++;
  }
  return enviados;
}
