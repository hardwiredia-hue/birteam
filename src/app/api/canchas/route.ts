import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { suscripcionActiva } from '@/lib/suscripcion';
import { esquemaCancha, erroresDeZod } from '@/lib/validacion';

/** Publicar una cancha: solo cuentas de dueño con suscripción activa. */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  if (usuario.tipoCuenta !== 'CANCHA') {
    return NextResponse.json(
      { error: 'Para publicar canchas necesitás una cuenta de dueño de cancha.' },
      { status: 403 }
    );
  }
  if (!suscripcionActiva(usuario)) {
    return NextResponse.json(
      { error: 'Tu suscripción no está activa. Escribinos a hola@birteam.com para activarla.' },
      { status: 403 }
    );
  }

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaCancha.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  const deporte = await prisma.deporte.findUnique({ where: { id: d.deporteId } });
  if (!deporte) return NextResponse.json({ error: 'Ese deporte no existe.' }, { status: 400 });

  const cancha = await prisma.cancha.create({
    data: {
      duenoId: usuario.id,
      nombre: d.nombre,
      descripcion: d.descripcion ?? null,
      deporteId: d.deporteId,
      direccion: d.direccion,
      ciudad: d.ciudad ?? null,
      provincia: d.provincia ?? null,
      pais: d.pais,
      latitud: d.latitud ?? null,
      longitud: d.longitud ?? null,
      precioPorHora: d.precioPorHora ?? null,
      telefono: d.telefono ?? null,
      fotos: JSON.stringify(d.fotos.map((nombre) => `/api/archivos/${nombre}`)),
      diasDisponibles: JSON.stringify([...new Set(d.diasDisponibles)].sort()),
    },
  });

  return NextResponse.json({ id: cancha.id }, { status: 201 });
}
