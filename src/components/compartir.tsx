'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LOGOS } from './logos-redes';

interface Red {
  clave: string;
  nombre: string;
  fondo: string;
  /** Logo de la red (viewbox 24) o ícono propio. */
  logo: React.ReactNode;
  enlace: (url: string, texto: string) => string;
}

const logo = (d: string) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden>
    <path d={d} />
  </svg>
);

const REDES: Red[] = [
  {
    clave: 'whatsapp',
    nombre: 'WhatsApp',
    fondo: '#25D366',
    logo: logo(LOGOS.whatsapp),
    enlace: (url, texto) => `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`,
  },
  {
    clave: 'telegram',
    nombre: 'Telegram',
    fondo: '#26A5E4',
    logo: logo(LOGOS.telegram),
    enlace: (url, texto) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(texto)}`,
  },
  {
    clave: 'facebook',
    nombre: 'Facebook',
    fondo: '#0866FF',
    logo: logo(LOGOS.facebook),
    enlace: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    clave: 'x',
    nombre: 'X',
    fondo: '#000000',
    logo: logo(LOGOS.x),
    enlace: (url, texto) =>
      `https://x.com/intent/post?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`,
  },
  {
    clave: 'email',
    nombre: 'Email',
    fondo: '#5F6368',
    logo: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="5.5" width="18" height="13" rx="2" />
        <path d="m3.5 7 8.5 6 8.5-6" />
      </svg>
    ),
    enlace: (url, texto) => `mailto:?subject=${encodeURIComponent(texto)}&body=${encodeURIComponent(`${texto}\n${url}`)}`,
  },
];

/**
 * Compartir con un panel propio: las redes con sus logos y el link para
 * copiar. No usa el menú del sistema operativo.
 */
export function Compartir({
  ruta,
  texto,
  titulo = 'Compartir',
  className,
  etiqueta,
  children,
  ariaLabel,
}: {
  /** Ruta pública ("/p/abc") o URL completa. */
  ruta: string;
  /** El mensaje que acompaña al link ("Sumate a mi partido en birteam"). */
  texto: string;
  titulo?: string;
  className?: string;
  /** Texto del botón (si no se pasan children). */
  etiqueta?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [url, setUrl] = useState('');
  const [copiado, setCopiado] = useState(false);
  const cerrar = useRef<HTMLButtonElement>(null);

  function abrir() {
    setUrl(ruta.startsWith('http') ? ruta : `${window.location.origin}${ruta}`);
    setCopiado(false);
    setAbierto(true);
  }

  // Escape cierra; mientras está abierto, la página de atrás no se desplaza.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (evento: KeyboardEvent) => evento.key === 'Escape' && setAbierto(false);
    const desborde = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', alTeclear);
    cerrar.current?.focus();
    return () => {
      document.body.style.overflow = desborde;
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Sin permiso de portapapeles: se selecciona para copiar a mano.
      document.getElementById('compartir-link')?.focus();
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <>
      <button type="button" className={className} onClick={abrir} aria-label={ariaLabel} aria-haspopup="dialog">
        {children ?? etiqueta ?? 'Compartir'}
      </button>
      {abierto
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
              <button
                type="button"
                aria-label="Cerrar"
                tabIndex={-1}
                className="absolute inset-0 cursor-default bg-black/60"
                onClick={() => setAbierto(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="compartir-titulo"
                className="relative w-full max-w-md rounded-t-[12px] border border-borde bg-panel p-5 pb-8 sm:max-w-sm sm:rounded-[12px] sm:pb-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p id="compartir-titulo" className="text-base font-semibold">
                    {titulo}
                  </p>
                  <button
                    ref={cerrar}
                    type="button"
                    onClick={() => setAbierto(false)}
                    aria-label="Cerrar"
                    className="flex h-8 w-8 items-center justify-center rounded-[6px] text-tinta-3 hover:text-tinta"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {REDES.map((red) => (
                    <a
                      key={red.clave}
                      href={red.enlace(url, texto)}
                      target={red.clave === 'email' ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      onClick={() => setAbierto(false)}
                      className="group flex flex-col items-center gap-1.5 rounded-[8px] py-1 text-center"
                    >
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-105 group-active:scale-95"
                        style={{
                          background: red.fondo,
                          // El negro de X necesita borde sobre el panel oscuro.
                          boxShadow: red.clave === 'x' ? 'inset 0 0 0 1px var(--borde-2)' : undefined,
                        }}
                      >
                        {red.logo}
                      </span>
                      <span className="text-[11.5px] text-tinta-2">{red.nombre}</span>
                    </a>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <input
                    id="compartir-link"
                    readOnly
                    value={url}
                    onFocus={(evento) => evento.currentTarget.select()}
                    className="campo min-w-0 flex-1 text-[13px] text-tinta-2"
                    aria-label="Link para compartir"
                  />
                  <button type="button" onClick={copiar} className="btn btn-secundario btn-sm shrink-0">
                    {copiado ? 'Copiado' : 'Copiar link'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
