import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { usuarioActual } from '@/lib/auth';
import { DIR_ARCHIVOS } from '@/lib/archivos';

const TIPOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_BYTES = 5 * 1024 * 1024;

/** Sube una foto. Devuelve el nombre para guardar y la URL para mostrar. */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const archivo = form?.get('archivo');
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 });
  }
  const extension = TIPOS[archivo.type];
  if (!extension) {
    return NextResponse.json({ error: 'Solo fotos JPG, PNG o WebP.' }, { status: 415 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La foto puede pesar hasta 5 MB.' }, { status: 413 });
  }

  const nombre = `${randomUUID()}.${extension}`;
  await mkdir(DIR_ARCHIVOS, { recursive: true });
  await writeFile(path.join(DIR_ARCHIVOS, nombre), Buffer.from(await archivo.arrayBuffer()));

  return NextResponse.json({ nombre, url: `/api/archivos/${nombre}` }, { status: 201 });
}
