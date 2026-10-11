import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ipDelPedido, permitir } from '@/lib/limite';

const VALIDO = /^[a-z0-9._]{3,24}$/;

/**
 * ¿Está libre este @usuario? Para avisar mientras se escribe en el registro
 * (los perfiles son públicos, así que no revela nada que no se vea igual).
 * Si está tomado, propone uno libre agregando un número.
 */
export async function GET(request: Request) {
  if (!permitir(`usuario-libre:${ipDelPedido(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Esperá un momento.' }, { status: 429 });
  }
  const pedido = (new URL(request.url).searchParams.get('u') ?? '').trim().toLowerCase().replace(/^@/, '');
  if (!VALIDO.test(pedido)) return NextResponse.json({ valido: false, disponible: false });

  const tomado = await prisma.usuario.findUnique({ where: { usuario: pedido }, select: { id: true } });
  if (!tomado) return NextResponse.json({ valido: true, disponible: true });

  const raiz = pedido.slice(0, 21);
  const candidatos = Array.from({ length: 8 }, (_, i) => `${raiz}${i + 2}`);
  const ocupados = await prisma.usuario.findMany({
    where: { usuario: { in: candidatos } },
    select: { usuario: true },
  });
  const sugerencia = candidatos.find((c) => !ocupados.some((o) => o.usuario === c)) ?? null;
  return NextResponse.json({ valido: true, disponible: false, sugerencia });
}
