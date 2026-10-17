import { prisma } from './db';
import { gestionaCancha } from './gestion';
import { avisarAlComplejo, avisarReserva, diasDeLaCancha, horariosDelDia } from './reservas';
import { armarTurnoFijo, rotuloFijo } from './turnos-fijos';

/**
 * "Pedir turno fijo": el jugador elige día y hora en la cancha y el
 * complejo lo acepta (se arma el turno fijo a su nombre) o lo rechaza.
 * Un pedido pendiente por cancha y por jugador.
 */

export async function pedirFijo(
  usuario: { id: string; nombre: string },
  canchaId: string,
  datos: { diaSemana: number; hora: string; nota?: string | null }
) {
  const cancha = await prisma.cancha.findUnique({ where: { id: canchaId } });
  if (!cancha || !cancha.activa) return 'Esa cancha no existe.';
  if (cancha.duenoId === usuario.id) return 'Es tu cancha: el turno fijo lo armás desde la grilla.';
  if (!cancha.reservasOnline) return 'Esta cancha no toma pedidos online: llamá al complejo.';
  if (!diasDeLaCancha(cancha.diasDisponibles).includes(datos.diaSemana)) return 'La cancha no abre ese día.';
  if (!horariosDelDia(cancha).includes(datos.hora)) return 'Ese horario no es un turno de la cancha.';

  const [pendiente, ocupado, yaTengo] = await Promise.all([
    prisma.pedidoFijo.findFirst({ where: { canchaId, usuarioId: usuario.id, estado: 'PENDIENTE' } }),
    prisma.turnoFijo.findFirst({ where: { canchaId, diaSemana: datos.diaSemana, hora: datos.hora, activo: true } }),
    prisma.turnoFijo.findFirst({ where: { canchaId, usuarioId: usuario.id, diaSemana: datos.diaSemana, hora: datos.hora, activo: true } }),
  ]);
  if (yaTengo) return 'Ya tenés ese turno fijo.';
  if (pendiente) return 'Ya tenés un pedido de turno fijo esperando respuesta en esta cancha.';
  if (ocupado) return 'Ese horario ya es turno fijo de otro equipo. Probá con otro.';

  const pedido = await prisma.pedidoFijo.create({
    data: { canchaId, usuarioId: usuario.id, diaSemana: datos.diaSemana, hora: datos.hora, nota: datos.nota || null },
  });
  await avisarAlComplejo(
    cancha.duenoId,
    'PEDIDO_FIJO',
    `Piden turno fijo · ${cancha.nombre}`,
    `${usuario.nombre} quiere los ${rotuloFijo(pedido).toLowerCase()} todas las semanas.${datos.nota ? ` "${datos.nota}"` : ''}`,
    `/canchas/${cancha.id}#fijos`
  );
  return null;
}

/** El complejo responde: aceptar arma el turno fijo; rechazar avisa. */
export async function responderPedidoFijo(gestorId: string, pedidoId: string, aceptar: boolean) {
  const pedido = await prisma.pedidoFijo.findUnique({
    where: { id: pedidoId },
    include: { cancha: true, usuario: { select: { id: true, nombre: true, telefono: true, eliminadoEn: true } } },
  });
  if (!pedido || pedido.estado !== 'PENDIENTE') return 'Ese pedido ya no está pendiente.';
  if (!(await gestionaCancha(gestorId, pedido.cancha))) return 'Lo responde el complejo.';

  if (aceptar) {
    if (pedido.usuario.eliminadoEn) return 'Esa cuenta ya no existe.';
    const resultado = await armarTurnoFijo(pedido.cancha, gestorId, {
      diaSemana: pedido.diaSemana,
      hora: pedido.hora,
      titular: pedido.usuario.nombre,
      jugadorId: pedido.usuario.id,
      telefono: pedido.usuario.telefono,
      nota: pedido.nota,
    });
    if ('error' in resultado) return resultado.error;
  }
  await prisma.pedidoFijo.update({
    where: { id: pedido.id },
    data: { estado: aceptar ? 'ACEPTADO' : 'RECHAZADO', respondidoEn: new Date() },
  });
  if (!aceptar) {
    await avisarReserva(
      pedido.usuario.id,
      'PEDIDO_FIJO',
      `Sin turno fijo · ${pedido.cancha.nombre}`,
      `El complejo no puede darte los ${rotuloFijo(pedido).toLowerCase()} fijo. Podés pedir otro horario o reservar semana a semana.`,
      `/canchas/${pedido.cancha.id}`
    );
  }
  return null;
}

/** El jugador retira su pedido. */
export async function retirarPedidoFijo(usuarioId: string, pedidoId: string) {
  const { count } = await prisma.pedidoFijo.updateMany({
    where: { id: pedidoId, usuarioId, estado: 'PENDIENTE' },
    data: { estado: 'RETIRADO', respondidoEn: new Date() },
  });
  return count > 0 ? null : 'Ese pedido ya no está pendiente.';
}
