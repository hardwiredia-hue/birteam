import Link from 'next/link';
import { Logotipo } from '@/components/marca';

export const metadata = { title: 'Página no encontrada', robots: { index: false } };

/** 404: la dirección no existe (o el partido, grupo o cancha ya no está). */
export default function NoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Logotipo ancho={110} />
      <div className="flex flex-1 flex-col justify-center gap-4 py-10">
        <p className="t-rotulo text-verde-txt">Error 404</p>
        <h1 className="t-display text-[36px] leading-none">
          Esta jugada
          <br />
          no existe
        </h1>
        <p className="text-sm text-tinta-2">
          El link está mal escrito o lo que buscabas ya no está: un partido cancelado, un grupo
          cerrado o una cancha que dejó de publicarse.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/" className="btn btn-primario">
            Ir al inicio
          </Link>
          <Link href="/explorar" className="btn btn-secundario">
            Explorar partidos
          </Link>
        </div>
      </div>
    </main>
  );
}
