import { NextResponse } from 'next/server';
import { usuarioActual } from '@/lib/auth';
import { guardarVideo } from '@/lib/archivos';

/** Sube un clip de video para una jugada. */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const resultado = await guardarVideo(form?.get('archivo'));
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }

  return NextResponse.json({ nombre: resultado.nombre, url: resultado.url }, { status: 201 });
}
