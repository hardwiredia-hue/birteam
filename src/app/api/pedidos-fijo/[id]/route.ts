import { NextResponse } from 'next/server';
import { z } from 'zod';
import { usuarioActual } from '@/lib/auth';
import { responderPedidoFijo, retirarPedidoFijo } from '@/lib/pedidos-fijo';

const esquema = z.object({ accion: z.enum(['aceptar', 'rechazar', 'retirar']) });

/** El complejo acepta o rechaza; el jugador lo retira. */
export async function PATCH(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  const { id } = await contexto.params;
  const error =
    datos.data.accion === 'retirar'
      ? await retirarPedidoFijo(usuario.id, id)
      : await responderPedidoFijo(usuario.id, id, datos.data.accion === 'aceptar');
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ listo: true });
}
