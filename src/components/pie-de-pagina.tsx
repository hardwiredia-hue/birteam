import Link from 'next/link';
import { Logotipo } from '@/components/marca';

/** Pie de página de escritorio (en móvil navega la barra inferior). */
export function PieDePagina() {
  return (
    <footer className="mt-14 hidden border-t border-borde pb-10 pt-8 lg:block">
      <div className="flex items-start justify-between gap-8">
        <div>
          <Logotipo ancho={100} />
          <p className="t-rotulo mt-3 text-verde-txt">Organizá · Jugá · Compartí</p>
        </div>

        <div className="flex gap-12 text-sm">
          <div className="flex flex-col gap-2">
            <p className="t-rotulo">birteam</p>
            <Link href="/explorar" className="text-tinta-2 hover:text-tinta">Explorar</Link>
            <Link href="/birtsocial" className="text-tinta-2 hover:text-tinta">BirtSocial</Link>
            <Link href="/clips" className="text-tinta-2 hover:text-tinta">Clips</Link>
            <Link href="/torneos" className="text-tinta-2 hover:text-tinta">Torneos</Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="t-rotulo">Legales y contacto</p>
            <Link href="/terminos" className="text-tinta-2 hover:text-tinta">Términos de uso</Link>
            <Link href="/privacidad" className="text-tinta-2 hover:text-tinta">Privacidad</Link>
            <a href="mailto:hola@birteam.com" className="text-tinta-2 hover:text-tinta">
              hola@birteam.com
            </a>
          </div>
        </div>
      </div>

      <p className="mt-8 text-xs text-tinta-3">
        © {new Date().getFullYear()} birteam · Hecho en Argentina.
      </p>
    </footer>
  );
}
