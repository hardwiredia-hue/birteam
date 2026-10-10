import { prisma } from './db';
import { enviarPush } from './push';

/**
 * Baja de cuenta pedida por su titular. No se borra la fila del usuario
 * (partidos, grupos y torneos de otros la referencian): se borran sus datos
 * personales y su contenido, y queda como "Usuario eliminado". Ya no puede
 * entrar: no tiene email real, contraseña ni Google vinculados.
 */

/** Motivo por el que todavía no se puede dar de baja, o null si se puede. */
export async function impedimentoParaBaja(usuarioId: string) {
  const ahora = new Date();
  const [comoJugador, enSusCanchas] = await Promise.all([
    prisma.reserva.count({
      where: {
        usuarioId,
        estado: { in: ['SOLICITADA', 'PENDIENTE_PAGO', 'CONFIRMADA'] },
        inicio: { gt: ahora },
        cancha: { duenoId: { not: usuarioId } },
      },
    }),
    prisma.reserva.count({
      where: {
        cancha: { duenoId: usuarioId },
        estado: { in: ['SOLICITADA', 'PENDIENTE_PAGO', 'CONFIRMADA'] },
        inicio: { gt: ahora },
      },
    }),
  ]);
  if (comoJugador > 0) {
    return `Tenés ${comoJugador} ${comoJugador === 1 ? 'turno reservado' : 'turnos reservados'} por delante. Cancelalos desde Reservas (así se devuelve lo pagado) y después volvé.`;
  }
  if (enSusCanchas > 0) {
    return `Tus canchas tienen ${enSusCanchas} ${enSusCanchas === 1 ? 'turno tomado' : 'turnos tomados'} por delante. Resolvelos desde Reservas antes de cerrar la cuenta.`;
  }
  return null;
}

export async function eliminarCuenta(usuarioId: string) {
  const ahora = new Date();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });

  // Partidos que organiza por delante: pasan al co-organizador o se cancelan con aviso.
  const organizados = await prisma.partido.findMany({
    where: { organizadorId: usuarioId, fecha: { gt: ahora }, estado: { in: ['ARMANDOSE', 'CONFIRMADO'] } },
    include: { participaciones: { where: { usuarioId: { not: usuarioId } }, select: { usuarioId: true } } },
  });
  for (const partido of organizados) {
    if (partido.coOrganizadorId && partido.coOrganizadorId !== usuarioId) {
      await prisma.partido.update({
        where: { id: partido.id },
        data: { organizadorId: partido.coOrganizadorId, coOrganizadorId: null },
      });
      continue;
    }
    await prisma.partido.update({ where: { id: partido.id }, data: { estado: 'CANCELADO' } });
    const avisados = partido.participaciones.map((p) => p.usuarioId);
    if (avisados.length > 0) {
      const titulo = 'Se canceló un partido';
      const cuerpo = `El organizador cerró su cuenta y el partido en ${partido.lugarNombre} quedó cancelado.`;
      await prisma.notificacion.createMany({
        data: avisados.map((id) => ({ usuarioId: id, tipo: 'PARTIDO_CANCELADO', titulo, cuerpo, url: `/partidos/${partido.id}` })),
      });
      await enviarPush(avisados, { titulo, cuerpo, url: `/partidos/${partido.id}` });
    }
  }
  await prisma.partido.updateMany({ where: { coOrganizadorId: usuarioId }, data: { coOrganizadorId: null } });

  // Grupos: si era el único admin, pasa a serlo el miembro más antiguo.
  const membresias = await prisma.miembroGrupo.findMany({ where: { usuarioId, rol: 'ADMIN' } });
  for (const membresia of membresias) {
    const otrosAdmins = await prisma.miembroGrupo.count({
      where: { grupoId: membresia.grupoId, rol: 'ADMIN', usuarioId: { not: usuarioId } },
    });
    if (otrosAdmins > 0) continue;
    const sucesor = await prisma.miembroGrupo.findFirst({
      where: { grupoId: membresia.grupoId, usuarioId: { not: usuarioId } },
      orderBy: { unidoEn: 'asc' },
    });
    if (sucesor) {
      await prisma.miembroGrupo.update({
        where: { grupoId_usuarioId: { grupoId: sucesor.grupoId, usuarioId: sucesor.usuarioId } },
        data: { rol: 'ADMIN' },
      });
    }
  }

  // Desafíos pendientes que mandó: se cancelan.
  await prisma.desafio.updateMany({
    where: { creadorId: usuarioId, estado: 'PENDIENTE' },
    data: { estado: 'CANCELADO', respondidoEn: ahora },
  });

  await prisma.$transaction([
    // Contenido y datos propios.
    prisma.jugada.deleteMany({ where: { autorId: usuarioId } }),
    prisma.comentarioJugada.deleteMany({ where: { autorId: usuarioId } }),
    prisma.meGustaJugada.deleteMany({ where: { usuarioId } }),
    prisma.mensaje.deleteMany({ where: { autorId: usuarioId } }),
    prisma.seguimiento.deleteMany({ where: { OR: [{ seguidorId: usuarioId }, { seguidoId: usuarioId }] } }),
    prisma.bloqueo.deleteMany({ where: { OR: [{ bloqueadorId: usuarioId }, { bloqueadoId: usuarioId }] } }),
    prisma.miembroGrupo.deleteMany({ where: { usuarioId } }),
    prisma.participacion.deleteMany({
      where: { usuarioId, partido: { fecha: { gt: ahora } } },
    }),
    prisma.usuarioDeporte.deleteMany({ where: { usuarioId } }),
    prisma.lugarGuardado.deleteMany({ where: { usuarioId } }),
    prisma.notificacion.deleteMany({ where: { usuarioId } }),
    prisma.suscripcionPush.deleteMany({ where: { usuarioId } }),
    prisma.sesion.deleteMany({ where: { usuarioId } }),
    prisma.cuentaMercadoPago.deleteMany({ where: { usuarioId } }),
    prisma.resenaCancha.deleteMany({ where: { usuarioId } }),
    // Sus canchas dejan de publicarse (las reservas pasadas quedan para los jugadores).
    prisma.cancha.updateMany({ where: { duenoId: usuarioId }, data: { activa: false } }),
    prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        nombre: 'Usuario eliminado',
        usuario: `eliminado-${usuarioId.slice(-10)}`,
        email: `eliminado-${usuarioId}@birteam.invalid`,
        hashClave: null,
        googleId: null,
        telefono: null,
        bio: null,
        avatarUrl: null,
        ciudad: null,
        provincia: null,
        latitud: null,
        longitud: null,
        complejoNombre: null,
        complejoDireccion: null,
        cuit: null,
        verificacionDocUrl: null,
        suscripcionHasta: null,
        rol: 'USUARIO',
        eliminadoEn: ahora,
      },
    }),
  ]);

  return { usuarioAnterior: usuario.usuario };
}
