import { NextResponse } from 'next/server';
import { usuarioActual } from '@/lib/auth';
import { buscarDonde } from '@/lib/lugares';
import { ubicacionDe } from '@/lib/ubicacion';

/**
 * "¿Dónde juegan?": /api/lugares?q=potrero&deporteId=…
 * Canchas publicadas y lugares de la comunidad, los más cerca primero.
 */
export async function GET(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const parametros = new URL(request.url).searchParams;
  const resultado = await buscarDonde({
    q: parametros.get('q')?.slice(0, 80) ?? null,
    deporteId: parametros.get('deporteId'),
    desde: await ubicacionDe(usuario),
    ciudad: usuario.ciudad,
  });
  return NextResponse.json(resultado);
}
