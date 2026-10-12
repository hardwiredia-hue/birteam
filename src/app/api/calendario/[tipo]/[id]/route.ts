import { NextResponse } from 'next/server';
import { usuarioActual } from '@/lib/auth';
import { archivoIcs } from '@/lib/calendario';
import { eventoDe, type TipoEvento } from '@/lib/calendario-eventos';

const TIPOS: TipoEvento[] = ['partido', 'reserva', 'fijo'];

/** Descarga el .ics de un partido, turno o turno fijo (se abre con el calendario del celu). */
export async function GET(_request: Request, contexto: { params: Promise<{ tipo: string; id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { tipo, id } = await contexto.params;
  if (!TIPOS.includes(tipo as TipoEvento)) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });

  const evento = await eventoDe(tipo as TipoEvento, id, usuario.id);
  if (!evento) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });

  return new NextResponse(archivoIcs(evento), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="birteam-${tipo}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
