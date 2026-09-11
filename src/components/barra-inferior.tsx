'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TRAZO = 1.8;

function IconoInicio() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={TRAZO} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}
function IconoExplorar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={TRAZO} strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function IconoMas() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconoGrupos() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={TRAZO} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5M15 14.5c2.8 0 5 1.6 5 4" />
    </svg>
  );
}
function IconoPerfil() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={TRAZO} strokeLinecap="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}

const ITEMS = [
  { href: '/panel', rotulo: 'Inicio', Icono: IconoInicio },
  { href: '/explorar', rotulo: 'Explorar', Icono: IconoExplorar },
  { href: '/crear', rotulo: 'Crear', Icono: IconoMas, central: true },
  { href: '/grupos', rotulo: 'Grupos', Icono: IconoGrupos },
  { href: '/perfil', rotulo: 'Perfil', Icono: IconoPerfil },
] as const;

/** Barra inferior de 5 posiciones con el "+" verde al centro (diseno/ §Barra inferior). */
export function BarraInferior() {
  const ruta = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-borde bg-panel">
      <div className="mx-auto grid h-16 w-full max-w-md grid-cols-5 items-center px-1">
        {ITEMS.map(({ href, rotulo, Icono, ...item }) => {
          const activo = ruta === href || ruta.startsWith(`${href}/`);
          if ('central' in item && item.central) {
            return (
              <Link key={href} href={href} aria-label={rotulo} className="flex justify-center">
                <span
                  className="-mt-8 flex h-11 w-11 items-center justify-center rounded-[6px] bg-verde text-sobre-verde"
                  style={{ boxShadow: '0 4px 14px rgba(168,230,23,0.35)' }}
                >
                  <IconoMas />
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2 ${activo ? 'text-verde-txt' : 'text-tinta-3'}`}
            >
              <Icono />
              <span className="t-rotulo !text-[9px] !tracking-[0.08em]" style={{ color: 'inherit' }}>
                {rotulo}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
