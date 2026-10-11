import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { gestionaCancha } from '@/lib/gestion';
import { esquemaTurnoFijo, erroresDeZod } from '@/lib/validacion';
import { avisarReserva, claveDia, diasDeLaCancha, horariosDelDia, liberarVencidas } from '@/lib/reservas';
import { MAXIMO_FIJOS_POR_CANCHA, materializarFijos, rotuloFijo, terminarFijo } from '@/lib/turnos-fijos';

/** Arma un turno fijo (dueño o empleado del complejo). */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { id } = await contexto.params;
  const cancha = await prisma.cancha.findUnique({ where: { id } });
  if (!cancha) return NextResponse.json({ error: 'Esa cancha no existe.' }, { status: 404 });
  if (!(await gestionaCancha(usuario.id, cancha))) {
    return NextResponse.json({ error: 'Los turnos fijos los arma el complejo.' }, { status: 403 });
  }

  const datos = esquemaTurnoFijo.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json({ error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) }, { status: 400 });
  }
  const { diaSemana, hora, titular } = datos.data;
  if (!diasDeLaCancha(cancha.diasDisponibles).includes(diaSemana)) {
    return NextResponse.json({ error: 'La cancha no abre ese día.' }, { status: 400 });
  }
  if (!horariosDelDia(cancha).includes(hora)) {
    return NextResponse.json({ error: 'Ese horario no es un turno de la cancha.' }, { status: 400 });
  }
  const hoy = claveDia();
  const desde = datos.data.desde && datos.data.desde > hoy ? datos.data.desde : hoy;

  let jugadorId: string | null = null;
  const nombreUsuario = datos.data.usuario?.replace(/^@/, '').toLowerCase();
  if (nombreUsuario) {
    const jugador = await prisma.usuario.findUnique({ where: { usuario: nombreUsuario } });
    if (!jugador || jugador.eliminadoEn) {
      return NextResponse.json({ error: `No encontramos a @${nombreUsuario} en birteam.` }, { status: 404 });
    }
    jugadorId = jugador.id;
  }

  const [repetido, cantidad] = await Promise.all([
    prisma.turnoFijo.findFirst({ where: { canchaId: cancha.id, diaSemana, hora, activo: true } }),
    prisma.turnoFijo.count({ where: { canchaId: cancha.id, activo: true } }),
  ]);
  if (repetido) {
    return NextResponse.json({ error: `Ese horario ya es el turno fijo de ${repetido.titular}.` }, { status: 409 });
  }
  if (cantidad >= MAXIMO_FIJOS_POR_CANCHA) {
    return NextResponse.json({ error: `Hasta ${MAXIMO_FIJOS_POR_CANCHA} turnos fijos por cancha.` }, { status: 409 });
  }

  await liberarVencidas(cancha.id);
  const fijo = await prisma.turnoFijo.create({
    data: {
      canchaId: cancha.id,
      diaSemana,
      hora,
      titular,
      usuarioId: jugadorId,
      telefono: datos.data.telefono || null,
      nota: datos.data.nota || null,
      desde,
      creadoPorId: usuario.id,
    },
  });
  await materializarFijos(cancha.id, { sinAvisoDe: fijo.id });

  const semanas = await prisma.reserva.findMany({
    where: { turnoFijoId: fijo.id },
    select: { fecha: true, estado: true },
    orderBy: { fecha: 'asc' },
  });
  if (jugadorId && jugadorId !== usuario.id) {
    await avisarReserva(
      jugadorId,
      'TURNO_FIJO',
      `Tenés turno fijo · ${cancha.nombre}`,
      `Te anotaron los ${rotuloFijo(fijo).toLowerCase()} todas las semanas. Si una semana no van, cancelala desde Reservas con tiempo.`,
      '/reservas'
    );
  }
  return NextResponse.json(
    {
      id: fijo.id,
      reservadas: semanas.filter((s) => s.estado !== 'CANCELADA').map((s) => s.fecha),
      tomadas: semanas.filter((s) => s.estado === 'CANCELADA').map((s) => s.fecha),
    },
    { status: 201 }
  );
}

/** Termina un turno fijo: el complejo, o el jugador que lo tiene. */
export async function DELETE(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { id } = await contexto.params;
  const cuerpo = await request.json().catch(() => ({}));
  const fijo = await prisma.turnoFijo.findFirst({
    where: { id: String(cuerpo?.id ?? ''), canchaId: id },
    include: { cancha: { select: { duenoId: true } } },
  });
  if (!fijo) return NextResponse.json({ error: 'Ese turno fijo no existe.' }, { status: 404 });

  const gestiona = await gestionaCancha(usuario.id, fijo.cancha);
  if (!gestiona && fijo.usuarioId !== usuario.id) {
    return NextResponse.json({ error: 'Ese turno fijo no es tuyo.' }, { status: 403 });
  }
  const terminado = await terminarFijo(fijo.id, gestiona ? 'COMPLEJO' : 'JUGADOR');
  if (!terminado) return NextResponse.json({ error: 'Ese turno fijo ya estaba terminado.' }, { status: 409 });
  return NextResponse.json({ listo: true });
}
