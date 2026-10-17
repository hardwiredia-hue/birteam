import { prisma } from './db';
import { enviarPush } from './push';
import { calcularTabla } from './torneos';

/**
 * Avisos del torneo: al organizador cuando se anota un equipo, y a los
 * capitanes cuando arranca, cuando se carga un resultado de su equipo y
 * cuando hay campeón. Sin avisos, el torneo dependía de entrar a mirar.
 */

async function avisar(usuarioIds: string[], aviso: { tipo: string; titulo: string; cuerpo: string; url: string }) {
  const ids = [...new Set(usuarioIds)];
  if (ids.length === 0) return 0;
  const vivos = (await prisma.usuario.findMany({ where: { id: { in: ids }, eliminadoEn: null }, select: { id: true } })).map(
    (u) => u.id
  );
  if (vivos.length === 0) return 0;
  await prisma.notificacion.createMany({ data: vivos.map((usuarioId) => ({ usuarioId, ...aviso })) });
  await enviarPush(vivos, { titulo: aviso.titulo, cuerpo: aviso.cuerpo, url: aviso.url });
  return vivos.length;
}

const url = (torneoId: string) => `/torneos/${torneoId}`;

/** Se anotó un equipo: al organizador (y si se llenó el cupo, que ya puede arrancar). */
export async function avisarInscripcion(torneoId: string, equipoNombre: string, capitanId: string) {
  const torneo = await prisma.torneo.findUnique({
    where: { id: torneoId },
    select: { nombre: true, organizadorId: true, maxEquipos: true, _count: { select: { equipos: true } } },
  });
  if (!torneo || torneo.organizadorId === capitanId) return 0;
  const lleno = torneo._count.equipos >= torneo.maxEquipos;
  return avisar([torneo.organizadorId], {
    tipo: 'TORNEO',
    titulo: `${equipoNombre} se anotó en ${torneo.nombre}`,
    cuerpo: lleno
      ? `Cupo completo (${torneo._count.equipos} equipos): ya podés arrancar el torneo.`
      : `Van ${torneo._count.equipos} de ${torneo.maxEquipos} equipos.`,
    url: url(torneoId),
  });
}

async function capitanes(torneoId: string) {
  const torneo = await prisma.torneo.findUnique({
    where: { id: torneoId },
    select: { nombre: true, organizadorId: true, formato: true, equipos: { select: { id: true, nombre: true, capitanId: true } } },
  });
  return torneo;
}

/** Arrancó: el fixture (o el cuadro) ya está. A todos los capitanes. */
export async function avisarArranque(torneoId: string) {
  const torneo = await capitanes(torneoId);
  if (!torneo) return 0;
  return avisar(
    torneo.equipos.map((e) => e.capitanId).filter((id) => id !== torneo.organizadorId),
    {
      tipo: 'TORNEO',
      titulo: `Arrancó ${torneo.nombre}`,
      cuerpo: torneo.formato === 'COPA' ? 'Ya está el cuadro: fijate contra quién te toca.' : 'Ya está el fixture: fijate contra quién te toca.',
      url: url(torneoId),
    }
  );
}

/** Resultado cargado: a los capitanes de los dos equipos (y campeón, si lo hay). */
export async function avisarResultado(torneoId: string, partidoTorneoId: string, campeonId: string | null) {
  const [torneo, partido] = await Promise.all([
    capitanes(torneoId),
    prisma.partidoTorneo.findUnique({ where: { id: partidoTorneoId } }),
  ]);
  if (!torneo || !partido || partido.golesLocal == null || partido.golesVisitante == null) return 0;
  const equipo = (id: string) => torneo.equipos.find((e) => e.id === id);
  const local = equipo(partido.localId);
  const visitante = equipo(partido.visitanteId);
  if (!local || !visitante) return 0;
  const penales =
    partido.penalesLocal != null && partido.penalesVisitante != null ? ` (${partido.penalesLocal}-${partido.penalesVisitante} por penales)` : '';
  let enviados = await avisar(
    [local.capitanId, visitante.capitanId].filter((id) => id !== torneo.organizadorId),
    {
      tipo: 'TORNEO',
      titulo: `${local.nombre} ${partido.golesLocal} - ${partido.golesVisitante} ${visitante.nombre}`,
      cuerpo: `Resultado cargado en ${torneo.nombre}${penales}. Mirá cómo quedó.`,
      url: url(torneoId),
    }
  );
  if (campeonId) enviados += await avisarCampeon(torneoId, campeonId);
  return enviados;
}

/** Terminó: a todos los capitanes, con el campeón. */
export async function avisarCampeon(torneoId: string, campeonId: string) {
  const torneo = await capitanes(torneoId);
  const campeon = torneo?.equipos.find((e) => e.id === campeonId);
  if (!torneo || !campeon) return 0;
  return avisar(
    torneo.equipos.map((e) => e.capitanId).filter((id) => id !== torneo.organizadorId),
    {
      tipo: 'TORNEO',
      titulo: `${campeon.nombre}, campeón de ${torneo.nombre}`,
      cuerpo: 'Terminó el torneo. Mirá la tabla final y los resultados.',
      url: url(torneoId),
    }
  );
}

/** Liga cerrada a mano: el campeón es el primero de la tabla. */
export async function campeonDeLiga(torneoId: string) {
  const torneo = await prisma.torneo.findUnique({
    where: { id: torneoId },
    select: { equipos: { select: { id: true, nombre: true } }, partidos: true },
  });
  if (!torneo) return null;
  return calcularTabla(torneo.equipos, torneo.partidos)[0]?.equipoId ?? null;
}
