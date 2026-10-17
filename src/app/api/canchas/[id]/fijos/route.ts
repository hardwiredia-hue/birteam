import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { gestionaCancha } from '@/lib/gestion';
import { esquemaTurnoFijo, erroresDeZod } from '@/lib/validacion';
import { armarTurnoFijo, terminarFijo } from '@/lib/turnos-fijos';

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
  let jugadorId: string | null = null;
  const nombreUsuario = datos.data.usuario?.replace(/^@/, '').toLowerCase();
  if (nombreUsuario) {
    const jugador = await prisma.usuario.findUnique({ where: { usuario: nombreUsuario } });
    if (!jugador || jugador.eliminadoEn) {
      return NextResponse.json({ error: `No encontramos a @${nombreUsuario} en birteam.` }, { status: 404 });
    }
    jugadorId = jugador.id;
  }

  const resultado = await armarTurnoFijo(cancha, usuario.id, {
    diaSemana,
    hora,
    titular,
    jugadorId,
    telefono: datos.data.telefono || null,
    nota: datos.data.nota || null,
    desde: datos.data.desde,
  });
  if ('error' in resultado) return NextResponse.json({ error: resultado.error }, { status: resultado.estado });
  return NextResponse.json(resultado, { status: 201 });
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
