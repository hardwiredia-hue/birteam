import { prisma } from '@/lib/db';
import { companerosFrecuentes } from '@/lib/tabla-grupo';
import { usuarioActual } from '@/lib/auth';
import { Asistente, type PartidoParaRepetir } from './asistente';
import { ZONA, claveDia, diaDeSemana, rotuloDia } from '@/lib/reservas';

export const metadata = { title: 'Crear partido' };
export const dynamic = 'force-dynamic';

export default async function Crear({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string; deporte?: string; reserva?: string; fecha?: string; hora?: string; encuesta?: string }>;
}) {
  const { grupo, deporte, reserva: reservaId, fecha, hora, encuesta } = await searchParams;
  const usuario = (await usuarioActual())!;

  const [deportes, membresias, lugares, seguimientos] = await Promise.all([
    prisma.deporte.findMany({
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true, slug: true },
    }),
    prisma.miembroGrupo.findMany({
      where: { usuarioId: usuario.id },
      include: { grupo: { select: { id: true, nombre: true, deporteId: true } } },
    }),
    prisma.lugarGuardado.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { ultimaVez: 'desc' },
      take: 8,
      select: { id: true, nombre: true, direccion: true, telefono: true },
    }),
    prisma.seguimiento.findMany({
      where: { seguidoId: usuario.id },
      include: { seguidor: { select: { id: true, nombre: true, usuario: true } } },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    }),
  ]);

  const frecuentes = await companerosFrecuentes(usuario.id);

  // Canchas que el asistente necesita conocer de entrada (la del turno y la del
  // último partido); el resto se busca en "¿Dónde juegan?".
  const canchasPublicadas: {
    id: string;
    nombre: string;
    direccion: string;
    telefono: string | null;
    ciudad: string | null;
    diasDisponibles: string;
    deporteId: string;
    deporte: { nombre: string };
  }[] = [];

  // Viene de un turno confirmado: la cancha, el día y la hora ya están definidos.
  const reserva = reservaId
    ? await prisma.reserva.findFirst({
        where: { id: reservaId, usuarioId: usuario.id, estado: 'CONFIRMADA', partidoId: null },
        include: {
          cancha: {
            select: {
              id: true,
              nombre: true,
              direccion: true,
              telefono: true,
              ciudad: true,
              diasDisponibles: true,
              deporteId: true,
              deporte: { select: { nombre: true } },
            },
          },
        },
      })
    : null;
  if (reserva && !canchasPublicadas.some((cancha) => cancha.id === reserva.canchaId)) {
    canchasPublicadas.unshift(reserva.cancha);
  }

  const [principal, anterior] = await Promise.all([
    prisma.usuarioDeporte.findFirst({
      where: { usuarioId: usuario.id },
      orderBy: { principal: 'desc' },
      select: { deporteId: true },
    }),
    prisma.partido.findFirst({
      where: { organizadorId: usuario.id, estado: { not: 'CANCELADO' } },
      orderBy: { creadoEn: 'desc' },
      include: { deporte: { select: { nombre: true } } },
    }),
  ]);
  // La cancha del último partido tiene que estar entre las elegibles para repetirlo.
  if (anterior?.canchaId && !canchasPublicadas.some((cancha) => cancha.id === anterior.canchaId)) {
    const sede = await prisma.cancha.findFirst({
      where: { id: anterior.canchaId, activa: true, dueno: { suscripcionHasta: { gt: new Date() } } },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        telefono: true,
        ciudad: true,
        diasDisponibles: true,
        deporteId: true,
        deporte: { select: { nombre: true } },
      },
    });
    if (sede) canchasPublicadas.unshift(sede);
  }
  let ultimo: PartidoParaRepetir | null = null;
  if (anterior) {
    const hora = anterior.fecha.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: ZONA });
    const diaSemana = diaDeSemana(claveDia(anterior.fecha));
    ultimo = {
      rotulo: `${anterior.deporte.nombre} · ${rotuloDia(claveDia(anterior.fecha)).split(' ')[0]} ${hora} · ${anterior.lugarNombre}`,
      deporteId: anterior.deporteId,
      grupoId: anterior.grupoId,
      lugarNombre: anterior.lugarNombre,
      direccion: anterior.direccion,
      lugarTelefono: anterior.lugarTelefono,
      canchaId: anterior.canchaId,
      diaSemana,
      hora,
      recurrenteSemanal: anterior.recurrenteSemanal,
      cupo: anterior.cupo,
      minimo: anterior.minimo,
      costoPorJugador: anterior.costoPorJugador,
      nivel: anterior.nivel,
      visibilidad: anterior.visibilidad === 'ABIERTO' ? 'ABIERTO' : 'GRUPO',
    };
  }

  const grupos = membresias.map((membresia) => membresia.grupo);
  const grupoInicial = grupos.find((g) => g.id === grupo) ?? null;
  const deporteInicial = deportes.find((d) => d.slug === deporte)?.id ?? null;

  return (
    <Asistente
      deportes={deportes}
      grupos={grupos}
      lugares={lugares}
      canchas={canchasPublicadas.map((cancha) => {
        let dias: number[] = [0, 1, 2, 3, 4, 5, 6];
        try {
          dias = JSON.parse(cancha.diasDisponibles);
        } catch {
          dias = [0, 1, 2, 3, 4, 5, 6];
        }
        return {
          id: cancha.id,
          nombre: cancha.nombre,
          direccion: cancha.direccion,
          telefono: cancha.telefono,
          ciudad: cancha.ciudad,
          deporte: cancha.deporte.nombre,
          deporteId: cancha.deporteId,
          diasDisponibles: dias,
        };
      })}
      // Para invitar de un toque: primero con quienes más jugás, después tus seguidores.
      seguidores={[...frecuentes, ...seguimientos.map((s) => s.seguidor)]
        .filter((persona, i, todos) => todos.findIndex((otra) => otra.id === persona.id) === i)
        .slice(0, 24)
        .map(({ id, nombre, usuario }) => ({ id, nombre, usuario }))}
      cuandoInicial={
        fecha && hora && encuesta && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && /^\d{2}:\d{2}$/.test(hora)
          ? { dia: fecha, hora, encuestaId: encuesta }
          : null
      }
      grupoInicial={grupoInicial?.id ?? null}
      deporteInicial={deporteInicial}
      deportePrincipal={principal?.deporteId ?? null}
      ultimo={ultimo}
      esDueno={usuario.tipoCuenta === 'CANCHA'}
      ciudad={usuario.ciudad}
      provincia={usuario.provincia}
      turnoInicial={
        reserva
          ? {
              reservaId: reserva.id,
              canchaId: reserva.canchaId,
              dia: reserva.fecha,
              hora: reserva.hora,
              deporteId: reserva.cancha.deporteId,
              precio: reserva.precio,
            }
          : null
      }
    />
  );
}
