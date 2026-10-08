import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { crearSesion } from '@/lib/auth';
import { esquemaCompletarGoogle, erroresDeZod } from '@/lib/validacion';
import { formatearCuit } from '@/lib/verificacion';
import { sitioEnConstruccion } from '@/lib/sitio';

/** Crea la cuenta que arrancó con Google, ya con @usuario y datos completos. */
export async function POST(request: Request) {
  if (await sitioEnConstruccion()) {
    return NextResponse.json(
      { error: 'birteam está en construcción. Muy pronto abrimos las inscripciones.' },
      { status: 503 }
    );
  }

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaCompletarGoogle.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  const pendiente = await prisma.tokenGoogle.findUnique({ where: { token: d.token } });
  if (!pendiente || pendiente.expiraEn < new Date()) {
    return NextResponse.json(
      { error: 'El ingreso con Google venció. Volvé a tocar "Continuar con Google".' },
      { status: 410 }
    );
  }

  const existente = await prisma.usuario.findFirst({
    where: { OR: [{ usuario: d.usuario }, { email: pendiente.email }, { googleId: pendiente.googleId }] },
    select: { usuario: true },
  });
  if (existente) {
    const detalles =
      existente.usuario === d.usuario
        ? { usuario: ['Ese usuario ya existe. Probá con otro.'] }
        : undefined;
    return NextResponse.json(
      { error: detalles ? 'Revisá los datos marcados.' : 'Ya hay una cuenta con ese email. Entrá con Google de nuevo.', detalles },
      { status: 409 }
    );
  }

  const deportes = d.deporteIds.length
    ? await prisma.deporte.findMany({ where: { id: { in: d.deporteIds } }, select: { id: true } })
    : [];

  const usuario = await prisma.usuario.create({
    data: {
      nombre: d.nombre,
      usuario: d.usuario,
      email: pendiente.email,
      hashClave: null,
      googleId: pendiente.googleId,
      avatarUrl: pendiente.foto,
      ciudad: d.ciudad ?? null,
      provincia: d.provincia ?? null,
      pais: d.pais,
      latitud: d.latitud ?? null,
      longitud: d.longitud ?? null,
      tipoCuenta: d.tipoCuenta,
      ...(d.tipoCuenta === 'CANCHA'
        ? {
            complejoNombre: d.complejoNombre ?? null,
            complejoDireccion: d.complejoDireccion ?? null,
            telefono: d.telefono ?? null,
            cuit: d.cuit ? formatearCuit(d.cuit) : null,
          }
        : {}),
      deportes: {
        create: deportes.map((deporte, indice) => ({
          deporteId: deporte.id,
          principal: indice === 0,
        })),
      },
    },
  });

  await prisma.tokenGoogle.delete({ where: { id: pendiente.id } });
  await crearSesion(usuario.id);
  return NextResponse.json({ id: usuario.id, usuario: usuario.usuario }, { status: 201 });
}
