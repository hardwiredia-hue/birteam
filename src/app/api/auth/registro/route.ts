import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { crearSesion, hashearClave } from '@/lib/auth';
import { esquemaRegistro, erroresDeZod } from '@/lib/validacion';
import { permitir, ipDelPedido } from '@/lib/limite';
import { formatearCuit } from '@/lib/verificacion';

export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => null);

  // Trampa para robots: el campo "web" está oculto y las personas no lo tocan.
  // Al que lo completa se le contesta como si hubiera funcionado, y listo.
  if (typeof cuerpo?.web === 'string' && cuerpo.web.trim() !== '') {
    return NextResponse.json({ id: 'ok', usuario: 'ok' }, { status: 201 });
  }

  // Tope por conexión: 5 cuentas por hora alcanzan para cualquier familia.
  if (!permitir(`registro:${ipDelPedido(request)}`, 5, 3600 * 1000)) {
    return NextResponse.json(
      { error: 'Se crearon muchas cuentas desde esta conexión. Esperá un rato y probá de nuevo.' },
      { status: 429 }
    );
  }
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
      tipoCuenta: d.tipoCuenta,
      ...(d.tipoCuenta === 'CANCHA'
        ? {
            complejoNombre: d.complejoNombre ?? null,
            cuit: d.cuit ? formatearCuit(d.cuit) : null,
          }
        : {}),
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
