import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { Logotipo } from '@/components/marca';

export default async function Portada() {
  const usuario = await usuarioActual();
  if (usuario) redirect('/panel');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Logotipo ancho={132} />

      <div className="flex flex-1 flex-col justify-center py-10">
        <p className="t-rotulo text-verde-txt">Organizá · Jugá · Compartí</p>
        <h1 className="t-display mt-3 text-[40px]">
          ¿Querés jugar?
          <br />
          Encontrá con quién.
        </h1>
        <p className="mt-4 text-tinta-2">
          Armá el partido, invitá a tu gente, manejá cupos y reemplazos. O encontrá partidos,
          jugadores y grupos cerca tuyo.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link href="/registro?puerta=grupo" className="tarjeta block p-4 transition-colors hover:border-borde-2">
            <span className="t-rotulo text-verde-txt">Ya tengo un grupo</span>
            <span className="mt-1 block font-semibold">Organizo partidos y controlo la asistencia</span>
          </Link>
          <Link href="/registro?puerta=jugar" className="tarjeta block p-4 transition-colors hover:border-borde-2">
            <span className="t-rotulo text-azul-txt">Busco con quién jugar</span>
            <span className="mt-1 block font-semibold">Encuentro partidos, jugadores y equipos cercanos</span>
          </Link>
        </div>

        <p className="t-rotulo mt-8">
          Fútbol · Básquet · Vóley · Rugby · Tenis · Pádel · Ciclismo y más
        </p>
      </div>

      <p className="text-center text-sm text-tinta-2">
        ¿Ya tenés cuenta?{' '}
        <Link href="/entrar" className="font-semibold text-verde-txt">
          Entrá
        </Link>
      </p>
    </main>
  );
}
