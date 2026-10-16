import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { gestionaCancha } from '@/lib/gestion';
import { MOTIVOS_CIERRE, abrirDia, cerrarDia, diaCerrable } from '@/lib/cerrar-dia';

const esquema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  motivo: z.enum(MOTIVOS_CIERRE).default('Feriado'),
  // Todas las canchas del complejo (no solo esta).
  todas: z.boolean().default(false),
});

/** La cancha (o todas las del complejo) que gestiona quien pide. */
async function canchasDelPedido(request: Request, id: string) {
  const usuario = await usuarioActual();
  if (!usuario) return { error: NextResponse.json({ error: 'Entrá primero.' }, { status: 401 }) };
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return { error: NextResponse.json({ error: 'Elegí el día.' }, { status: 400 }) };
  if (!diaCerrable(datos.data.fecha)) {
    return { error: NextResponse.json({ error: 'Ese día no se puede cerrar: elegí uno de los próximos.' }, { status: 400 }) };
  }
  const cancha = await prisma.cancha.findUnique({ where: { id } });
  if (!cancha) return { error: NextResponse.json({ error: 'Esa cancha no existe.' }, { status: 404 }) };
  if (!(await gestionaCancha(usuario.id, cancha))) {
    return { error: NextResponse.json({ error: 'Lo hace el complejo.' }, { status: 403 }) };
  }
  const canchas = datos.data.todas
    ? await prisma.cancha.findMany({ where: { duenoId: cancha.duenoId, activa: true }, orderBy: { creadoEn: 'asc' } })
    : [cancha];
  return { usuario, datos: datos.data, canchas };
}

/** Cerrar el día: bloquea los turnos libres y lista lo que ya estaba reservado. */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const pedido = await canchasDelPedido(request, (await contexto.params).id);
  if ('error' in pedido) return pedido.error;
  const resultado = await cerrarDia({
    canchas: pedido.canchas,
    fecha: pedido.datos.fecha,
    motivo: pedido.datos.motivo,
    usuarioId: pedido.usuario.id,
  });
  return NextResponse.json(resultado);
}

/** Abrir el día: saca los bloqueos del cierre (no los puestos a mano). */
export async function DELETE(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const pedido = await canchasDelPedido(request, (await contexto.params).id);
  if ('error' in pedido) return pedido.error;
  const liberados = await abrirDia(pedido.canchas.map((c) => c.id), pedido.datos.fecha);
  return NextResponse.json({ liberados });
}
