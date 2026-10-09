'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconoExplorar,
  IconoInicio,
  IconoJugadas,
  IconoPerfil,
} from '@/components/barra-inferior';

function IconoReservas() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8.5 14.5l2.2 2.2 4.3-4.4" />
    </svg>
  );
}

function IconoRadar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12l5.5-5.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}

const ITEMS = [
  { href: '/panel', rotulo: 'Inicio', Icono: IconoInicio },
  { href: '/explorar', rotulo: 'Explorar', Icono: IconoExplorar },
  { href: '/birtsocial', rotulo: 'BirtSocial', Icono: IconoJugadas },
  { href: '/radar', rotulo: 'Radar', Icono: IconoRadar },
  { href: '/reservas', rotulo: 'Reservas', Icono: IconoReservas },
  { href: '/perfil', rotulo: 'Perfil', Icono: IconoPerfil },
] as const;

/** Navegación de escritorio: columna fija a la izquierda (en móvil manda la barra inferior). */
export function BarraLateral() {
  const ruta = usePathname();

  return (
    <aside className="hidden lg:block lg:w-56 lg:flex-shrink-0">
      <div className="sticky top-8 flex flex-col gap-6">
        <nav className="flex flex-col gap-1">
          {ITEMS.map(({ href, rotulo, Icono }) => {
            const activo = ruta === href || ruta.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  color: activo ? 'var(--verde-txt)' : 'var(--tinta-2)',
                  background: activo ? 'rgba(168,230,23,0.08)' : 'transparent',
                }}
              >
                <Icono />
                {rotulo}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
