import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { enviarPush } from '@/lib/push';

const MAXIMO_EMPLEADOS = 10;

/** Sumar un empleado al complejo por su @usuario. Solo el dueño. */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario || usuario.tipoCuenta !== 'CANCHA') {
    return NextResponse.json({ error: 'Solo el dueño del complejo.' }, { status: 403 });
  }
  const cuerpo = await request.json().catch(() => ({}));
  const nombreUsuario = String(cuerpo?.usuario ?? '').trim().replace(/^@/, '').toLowerCase();
  if (!nombreUsuario) return NextResponse.json({ error: 'Escribí el @usuario.' }, { status: 400 });

  const empleado = await prisma.usuario.findUnique({ where: { usuario: nombreUsuario } });
  if (!empleado || empleado.eliminadoEn) {
    return NextResponse.json({ error: `No encontramos a @${nombreUsuario} en birteam.` }, { status: 404 });
  }
  if (empleado.id === usuario.id) {
    return NextResponse.json({ error: 'Vos ya gestionás tu complejo.' }, { status: 400 });
  }
  const cantidad = await prisma.empleadoComplejo.count({ where: { duenoId: usuario.id } });
  if (cantidad >= MAXIMO_EMPLEADOS) {
    return NextResponse.json({ error: `Hasta ${MAXIMO_EMPLEADOS} personas en el equipo.` }, { status: 409 });
  }

  const existente = await prisma.empleadoComplejo.findUnique({
    where: { duenoId_usuarioId: { duenoId: usuario.id, usuarioId: empleado.id } },
  });
  if (existente) return NextResponse.json({ error: 'Ya está en tu equipo.' }, { status: 409 });

  await prisma.empleadoComplejo.create({ data: { duenoId: usuario.id, usuarioId: empleado.id } });
  const titulo = `${usuario.complejoNombre ?? usuario.nombre} te sumó a su equipo`;
  const cuerpoAviso = 'Ya podés ver y gestionar los turnos de sus canchas desde Reservas.';
  await prisma.notificacion.create({
    data: { usuarioId: empleado.id, tipo: 'EQUIPO_COMPLEJO', titulo, cuerpo: cuerpoAviso, url: '/reservas' },
  });
  await enviarPush(empleado.id, { titulo, cuerpo: cuerpoAviso, url: '/reservas' });
  return NextResponse.json({ listo: true }, { status: 201 });
}

/** Sacar a alguien del equipo: el dueño, o el propio empleado que se va. */
export async function DELETE(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const cuerpo = await request.json().catch(() => ({}));
  const id = String(cuerpo?.id ?? '');
  const empleo = await prisma.empleadoComplejo.findUnique({ where: { id } });
  if (!empleo || (empleo.duenoId !== usuario.id && empleo.usuarioId !== usuario.id)) {
    return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
  }
  await prisma.empleadoComplejo.delete({ where: { id: empleo.id } });
  return NextResponse.json({ listo: true });
}
