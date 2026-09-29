import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat, readFile } from 'fs/promises';
import { Readable } from 'stream';
import path from 'path';
import { DIR_ARCHIVOS } from '@/lib/archivos';

const CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};
const SON_VIDEO = new Set(['mp4', 'webm', 'mov']);

/**
 * Sirve una foto o un clip subido. Los nombres son UUIDs: imposibles de
 * adivinar. Los videos se sirven por rangos (Range/206): sin eso, el iPhone
 * no reproduce y no se puede saltar dentro del clip.
 */
export async function GET(request: Request, contexto: { params: Promise<{ nombre: string }> }) {
  const { nombre } = await contexto.params;
  // Validación estricta: nada de escaparse de la carpeta.
  const valido = /^[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm|mov)$/.exec(nombre);
  if (!valido) return NextResponse.json({ error: 'Archivo inexistente.' }, { status: 404 });

  const extension = valido[1];
  const ruta = path.join(DIR_ARCHIVOS, nombre);

  try {
    if (!SON_VIDEO.has(extension)) {
      const contenido = await readFile(ruta);
      return new NextResponse(new Uint8Array(contenido), {
        headers: {
          'Content-Type': CONTENT_TYPE[extension],
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    const info = await stat(ruta);
    const rango = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
    const desde = rango && rango[1] !== '' ? Number(rango[1]) : 0;
    const hasta =
      rango && rango[2] !== '' ? Math.min(Number(rango[2]), info.size - 1) : info.size - 1;

    if (desde >= info.size || desde > hasta) {
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${info.size}` },
      });
    }

    const flujo = Readable.toWeb(
      createReadStream(ruta, { start: desde, end: hasta })
    ) as ReadableStream;

    return new NextResponse(flujo, {
      status: rango ? 206 : 200,
      headers: {
        'Content-Type': CONTENT_TYPE[extension],
        'Content-Length': String(hasta - desde + 1),
        'Accept-Ranges': 'bytes',
        ...(rango ? { 'Content-Range': `bytes ${desde}-${hasta}/${info.size}` } : {}),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Archivo inexistente.' }, { status: 404 });
  }
}
