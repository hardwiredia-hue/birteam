import { NextResponse } from 'next/server';
import { z } from 'zod';
import { usuarioActual } from '@/lib/auth';
import { MAXIMO_OPCIONES, crearEncuesta } from '@/lib/encuestas';

const esquema = z.object({
  // Instantes ISO (el navegador arma día + hora en horario argentino).
  opciones: z.array(z.string().datetime({ offset: true })).max(MAXIMO_OPCIONES * 2),
});

/** "¿Cuándo jugamos?": proponer horarios al grupo. */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Revisá los horarios.' }, { status: 400 });
  const { id } = await contexto.params;
  const resultado = await crearEncuesta(usuario, id, datos.data.opciones.map((o) => new Date(o)));
  if ('error' in resultado) return NextResponse.json({ error: resultado.error }, { status: 400 });
  return NextResponse.json(resultado, { status: 201 });
}
