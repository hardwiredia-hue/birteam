'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconoExplorar,
  IconoInicio,
  IconoJugadas,
  IconoPerfil,
} from '@/components/barra-inferior';

const ITEMS = [
  { href: '/panel', rotulo: 'Inicio', Icono: IconoInicio },
  { href: '/explorar', rotulo: 'Explorar', Icono: IconoExplorar },
  { href: '/birtsocial', rotulo: 'BirtSocial', Icono: IconoJugadas },
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
