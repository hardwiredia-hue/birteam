import Link from 'next/link';
import type { Articulo, Tema } from '@/lib/ayuda';
import { Logotipo } from '@/components/marca';

const TRAZOS: Record<Tema['icono'], React.ReactNode> = {
  inicio: (
    <>
      <path d="M5 19V9.5L12 4l7 5.5V19" />
      <path d="M9.5 19v-5h5v5" />
    </>
  ),
  partido: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m12 7.5 3.8 2.8-1.5 4.4H9.7L8.2 10.3z" />
    </>
  ),
  grupo: (
    <>
      <circle cx="9" cy="9" r="3" />
      <circle cx="16.5" cy="10" r="2.3" />
      <path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M15 14.6c2.6-.3 4.8 1.2 5.5 4.4" />
    </>
  ),
  cancha: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M12 5v14" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  complejo: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h3M8 17h6" />
    </>
  ),
  torneo: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v3.5M8.5 20h7M10 16.5h4V20h-4z" />
    </>
  ),
  social: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="m10 9.5 4.5 2.5-4.5 2.5z" />
    </>
  ),
  cuenta: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5c.9-3.6 3.6-5.5 7-5.5s6.1 1.9 7 5.5" />
    </>
  ),
};

export function IconoTema({ icono, tam = 22 }: { icono: Tema['icono']; tam?: number }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {TRAZOS[icono]}
    </svg>
  );
}

/** Cabecera del centro de ayuda: se ve igual con o sin cuenta. */
export function CabeceraAyuda({ conCuenta }: { conCuenta: boolean }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href={conCuenta ? '/panel' : '/'} aria-label="birteam">
        <Logotipo ancho={100} />
      </Link>
      <Link href={conCuenta ? '/panel' : '/entrar'} className="btn btn-secundario btn-sm">
        {conCuenta ? 'Volver a la app' : 'Entrar'}
      </Link>
    </header>
  );
}

/** Pie con la salida para lo que la ayuda no resuelve. */
export function ContactoAyuda() {
  return (
    <section className="tarjeta flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[15px] font-semibold">¿No encontraste lo que buscabas?</p>
        <p className="text-sm text-tinta-2">Escribinos y te respondemos a la brevedad.</p>
      </div>
      <a href="mailto:hola@birteam.com" className="text-sm font-semibold text-verde-txt">
        hola@birteam.com
      </a>
    </section>
  );
}

/**
 * Atajo a la ayuda desde una pantalla de la app ("¿Cómo funciona?").
 * Lleva directo al artículo que explica esa pantalla.
 */
export function EnlaceAyuda({
  tema,
  articulo,
  rotulo = '¿Cómo funciona?',
  className = '',
}: {
  tema: string;
  articulo?: string;
  rotulo?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/ayuda/${tema}${articulo ? `#${articulo}` : ''}`}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold text-tinta-2 hover:text-tinta ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
        <circle cx="8" cy="8" r="6.5" />
        <path d="M6.2 6.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4" />
        <circle cx="8" cy="11.6" r="0.4" fill="currentColor" />
      </svg>
      {rotulo}
    </Link>
  );
}

/** El contenido de un artículo: párrafos, pasos numerados y el atajo. */
export function CuerpoArticulo({ articulo }: { articulo: Articulo }) {
  return (
    <div className="flex flex-col gap-3 text-[14.5px] leading-relaxed text-tinta-2">
      {articulo.pasos ? (
        <ol className="flex flex-col gap-2.5">
          {articulo.pasos.map((paso, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-borde-2 font-mono text-[11px] font-semibold text-verde-txt tabular">
                {i + 1}
              </span>
              <span>{paso}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {articulo.texto.map((parrafo, i) => (
        <p key={i}>{parrafo}</p>
      ))}
      {articulo.enlace ? (
        <Link href={articulo.enlace.href} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-verde-txt">
          {articulo.enlace.rotulo}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
      ) : null}
    </div>
  );
}
