import { prisma } from './db';
import { enviarPush } from './push';

/**
 * ¿Jugó en esta cancha? Solo así puede reseñarla: un turno confirmado que
 * ya pasó, o un partido en esa cancha (ya jugado) donde fue de los que iban.
 */
export async function jugoEnLaCancha(usuarioId: string, canchaId: string) {
  const ahora = new Date();
  const [turno, partido] = await Promise.all([
    prisma.reserva.findFirst({
      where: { usuarioId, canchaId, estado: 'CONFIRMADA', inicio: { lt: ahora } },
      select: { id: true },
    }),
    prisma.participacion.findFirst({
      where: { usuarioId, estado: 'VOY', partido: { canchaId, fecha: { lt: ahora } } },
      select: { id: true },
    }),
  ]);
  return Boolean(turno || partido);
}

/** Promedio y cantidad de reseñas por cancha, para listas. */
export async function puntajesDeCanchas(canchaIds: string[]) {
  if (canchaIds.length === 0) return new Map<string, { promedio: number; cantidad: number }>();
  const filas = await prisma.resenaCancha.groupBy({
    by: ['canchaId'],
    where: { canchaId: { in: canchaIds } },
    _avg: { puntaje: true },
    _count: { _all: true },
  });
  return new Map(
    filas.map((fila) => [
      fila.canchaId,
      { promedio: fila._avg.puntaje ?? 0, cantidad: fila._count._all },
    ])
  );
}

/** "4,5" */
export function formatearPuntaje(promedio: number) {
  return promedio.toFixed(1).replace('.', ',');
}

/**
 * "¿Cómo estuvo la cancha?": entre 1 y 26 h después de jugar (un turno o un
 * partido en una cancha publicada), una sola vez por cancha y solo si
 * todavía no la reseñó. Lo corren las tareas programadas.
 */
export async function pedirResenas(ahora = new Date()) {
  const desde = new Date(ahora.getTime() - 26 * 3600_000);
  const hasta = new Date(ahora.getTime() - 3600_000);
  // El inicio puede ser hasta 2 h antes del fin (turnos largos): se filtra fino abajo.
  const ventana = { gte: new Date(desde.getTime() - 2 * 3600_000), lte: hasta };
  const termino = (inicio: Date, minutos: number) => {
    const fin = inicio.getTime() + minutos * 60_000;
    return fin >= desde.getTime() && fin <= hasta.getTime();
  };

  const [turnos, partidos] = await Promise.all([
    prisma.reserva.findMany({
      where: { estado: 'CONFIRMADA', noVino: false, inicio: ventana, cancha: { activa: true } },
      select: { usuarioId: true, inicio: true, duracion: true, cancha: { select: { id: true, nombre: true, duenoId: true } } },
    }),
    prisma.partido.findMany({
      where: { estado: { not: 'CANCELADO' }, canchaId: { not: null }, fecha: ventana, cancha: { activa: true } },
      select: {
        fecha: true,
        duracionMin: true,
        cancha: { select: { id: true, nombre: true, duenoId: true } },
        participaciones: { where: { estado: 'VOY' }, select: { usuarioId: true } },
      },
    }),
  ]);

  const pares = new Map<string, { usuarioId: string; canchaId: string; nombre: string }>();
  const sumar = (usuarioId: string, cancha: { id: string; nombre: string; duenoId: string }) => {
    if (usuarioId === cancha.duenoId) return;
    pares.set(`${usuarioId}|${cancha.id}`, { usuarioId, canchaId: cancha.id, nombre: cancha.nombre });
  };
  for (const t of turnos) if (termino(t.inicio, t.duracion)) sumar(t.usuarioId, t.cancha);
  for (const p of partidos) {
    if (!p.cancha || !termino(p.fecha, p.duracionMin)) continue;
    for (const participacion of p.participaciones) sumar(participacion.usuarioId, p.cancha);
  }
  if (pares.size === 0) return 0;

  const lista = [...pares.values()];
  const usuarioIds = [...new Set(lista.map((p) => p.usuarioId))];
  const [resenas, pedidos, activos] = await Promise.all([
    prisma.resenaCancha.findMany({ where: { usuarioId: { in: usuarioIds } }, select: { usuarioId: true, canchaId: true } }),
    prisma.notificacion.findMany({
      where: { usuarioId: { in: usuarioIds }, tipo: 'PEDIR_RESENA' },
      select: { usuarioId: true, url: true },
    }),
    prisma.usuario.findMany({ where: { id: { in: usuarioIds }, eliminadoEn: null }, select: { id: true } }),
  ]);
  const yaReseno = new Set(resenas.map((r) => `${r.usuarioId}|${r.canchaId}`));
  const yaPedido = new Set(pedidos.map((n) => `${n.usuarioId}|${n.url}`));
  const vivos = new Set(activos.map((u) => u.id));
  const url = (canchaId: string) => `/canchas/${canchaId}#resenas`;
  const nuevos = lista.filter(
    (p) => vivos.has(p.usuarioId) && !yaReseno.has(`${p.usuarioId}|${p.canchaId}`) && !yaPedido.has(`${p.usuarioId}|${url(p.canchaId)}`)
  );

  for (const pedido of nuevos) {
    const titulo = `¿Cómo estuvo ${pedido.nombre}?`;
    const cuerpo = 'Contales a los demás: puntaje y, si querés, dos líneas. Le sirve al complejo y al que viene.';
    await prisma.notificacion.create({
      data: { usuarioId: pedido.usuarioId, tipo: 'PEDIR_RESENA', titulo, cuerpo, url: url(pedido.canchaId) },
    });
    await enviarPush(pedido.usuarioId, { titulo, cuerpo, url: url(pedido.canchaId) });
  }
  return nuevos.length;
}
