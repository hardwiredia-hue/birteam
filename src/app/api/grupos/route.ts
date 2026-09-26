import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { slugificar } from '@/lib/normalizar';
import { esquemaGrupo, erroresDeZod } from '@/lib/validacion';

export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá para crear un grupo.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaGrupo.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  const deporte = await prisma.deporte.findUnique({ where: { id: d.deporteId } });
  if (!deporte) return NextResponse.json({ error: 'Ese deporte no existe.' }, { status: 400 });

  // Slug único: "los-pibes", "los-pibes-2", …
  const base = slugificar(d.nombre) || 'grupo';
  let slug = base;
  for (let intento = 2; await prisma.grupo.findUnique({ where: { slug } }); intento++) {
    slug = `${base}-${intento}`;
  }

  const grupo = await prisma.grupo.create({
    data: {
      nombre: d.nombre,
      slug,
      descripcion: d.descripcion ?? null,
      deporteId: deporte.id,
      ciudad: usuario.ciudad,
      provincia: usuario.provincia,
      pais: usuario.pais,
      latitud: usuario.latitud,
      longitud: usuario.longitud,
      creadorId: usuario.id,
      miembros: { create: { usuarioId: usuario.id, rol: 'ADMIN' } },
    },
  });

  return NextResponse.json({ id: grupo.id }, { status: 201 });
}
