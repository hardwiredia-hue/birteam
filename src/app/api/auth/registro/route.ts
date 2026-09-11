import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { crearSesion, hashearClave } from '@/lib/auth';
import { esquemaRegistro, erroresDeZod } from '@/lib/validacion';

export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaRegistro.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  const existente = await prisma.usuario.findFirst({
    where: { OR: [{ usuario: d.usuario }, { email: d.email }] },
    select: { usuario: true, email: true },
  });
  if (existente) {
    const detalles =
      existente.usuario === d.usuario
        ? { usuario: ['Ese usuario ya existe. Probá con otro.'] }
        : { email: ['Ya hay una cuenta con ese email. ¿Querés entrar?'] };
    return NextResponse.json({ error: 'Revisá los datos marcados.', detalles }, { status: 409 });
  }

  const deportes = d.deporteIds.length
    ? await prisma.deporte.findMany({ where: { id: { in: d.deporteIds } }, select: { id: true } })
    : [];

  const usuario = await prisma.usuario.create({
    data: {
      nombre: d.nombre,
      usuario: d.usuario,
      email: d.email,
      hashClave: await hashearClave(d.clave),
      ciudad: d.ciudad ?? null,
      provincia: d.provincia ?? null,
      pais: d.pais,
      latitud: d.latitud ?? null,
      longitud: d.longitud ?? null,
      deportes: {
        create: deportes.map((deporte, indice) => ({
          deporteId: deporte.id,
          // El primero elegido es el principal.
          principal: indice === 0,
        })),
      },
    },
  });

  await crearSesion(usuario.id);
  return NextResponse.json({ id: usuario.id, usuario: usuario.usuario }, { status: 201 });
}
