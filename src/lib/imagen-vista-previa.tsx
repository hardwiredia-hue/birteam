import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import type { VistaPrevia } from './vista-previa';

/** El tamaño que usan WhatsApp, Facebook, X y compañía. */
export const TAMANO = { width: 1200, height: 630 };

let logo: string | null = null;
function logoBlanco() {
  if (logo === null) {
    try {
      const archivo = readFileSync(path.join(process.cwd(), 'public', 'birteam-blanco.png'));
      logo = `data:image/png;base64,${archivo.toString('base64')}`;
    } catch {
      logo = '';
    }
  }
  return logo;
}

/** Las letras de la marca (Archivo itálica y Spline Sans Mono, licencia OFL). */
let fuentes: { name: string; data: Buffer; weight: 500 | 800; style: 'normal' | 'italic' }[] | null = null;
function fuentesDeMarca() {
  if (fuentes === null) {
    try {
      const carpeta = path.join(process.cwd(), 'src', 'fuentes');
      fuentes = [
        { name: 'Archivo', data: readFileSync(path.join(carpeta, 'archivo-800-italica.ttf')), weight: 800, style: 'italic' },
        { name: 'Spline Sans Mono', data: readFileSync(path.join(carpeta, 'spline-sans-mono-500.ttf')), weight: 500, style: 'normal' },
      ];
    } catch {
      fuentes = [];
    }
  }
  return fuentes;
}

/**
 * La imagen de la vista previa, con la marca: fondo oscuro, rótulo y lo
 * destacado en lima, el dato principal grande. Sin datos (link viejo o
 * borrado), la imagen genérica de birteam.
 */
export function imagenVistaPrevia(vista: VistaPrevia | null) {
  const datos = vista ?? {
    rotulo: 'Organizá · Jugá · Compartí',
    grande: '¿Querés jugar?',
    detalle: 'Encontrá con quién, cerca tuyo.',
    destacado: null,
  };
  const marca = logoBlanco();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0b08',
          padding: '64px 72px',
          color: '#f4f6ea',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {marca ? <img src={marca} alt="" width={230} height={56} style={{ objectFit: 'contain' }} /> : <span style={{ fontSize: 44, fontWeight: 800 }}>birteam</span>}
          <div style={{ display: 'flex', width: 120, height: 10, background: '#a8e617', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ fontFamily: 'Spline Sans Mono', fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', color: '#a8e617' }}>
            {datos.rotulo}
          </span>
          <span
            style={{
              fontFamily: 'Archivo',
              fontSize: datos.grande.length > 22 ? 76 : 104,
              fontWeight: 800,
              fontStyle: 'italic',
              textTransform: 'uppercase',
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            {datos.grande}
          </span>
          <span style={{ fontFamily: 'Spline Sans Mono', fontSize: 30, color: '#bbc1a8' }}>{datos.detalle}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {datos.destacado ? (
            <span
              style={{
                display: 'flex',
                fontFamily: 'Archivo',
                fontSize: 38,
                fontWeight: 800,
                fontStyle: 'italic',
                textTransform: 'uppercase',
                background: '#a8e617',
                color: '#0b0d03',
                padding: '12px 28px',
                borderRadius: 10,
              }}
            >
              {datos.destacado}
            </span>
          ) : (
            <span />
          )}
          <span style={{ fontFamily: 'Spline Sans Mono', fontSize: 26, color: '#818872' }}>birteam.com</span>
        </div>
      </div>
    ),
    { ...TAMANO, fonts: fuentesDeMarca() }
  );
}
