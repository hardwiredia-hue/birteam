import { NextResponse } from 'next/server';
import { usuarioActual } from '@/lib/auth';
import { guardarImagen } from '@/lib/archivos';

/** Sube una foto. Devuelve el nombre para guardar y la URL para mostrar. */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const resultado = await guardarImagen(form?.get('archivo'));
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }

  return NextResponse.json({ nombre: resultado.nombre, url: resultado.url }, { status: 201 });
}
