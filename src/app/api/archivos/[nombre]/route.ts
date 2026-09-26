import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { DIR_ARCHIVOS } from '@/lib/archivos';

const CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Sirve una foto subida. Los nombres son UUIDs: imposibles de adivinar. */
export async function GET(_request: Request, contexto: { params: Promise<{ nombre: string }> }) {
  const { nombre } = await contexto.params;
  // Validación estricta: nada de escaparse de la carpeta.
  const valido = /^[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(nombre);
  if (!valido) return NextResponse.json({ error: 'Archivo inexistente.' }, { status: 404 });

  try {
    const contenido = await readFile(path.join(DIR_ARCHIVOS, nombre));
    return new NextResponse(new Uint8Array(contenido), {
      headers: {
        'Content-Type': CONTENT_TYPE[valido[1]],
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Archivo inexistente.' }, { status: 404 });
  }
}
