import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { sitioEnConstruccion } from '@/lib/sitio';
import { Logotipo } from '@/components/marca';
import { PaginaConstruccion } from '@/components/construccion';

export default async function Portada() {
  const usuario = await usuarioActual();
  if ((await sitioEnConstruccion()) && usuario?.rol !== 'ADMIN') {
    return <PaginaConstruccion />;
  }
  if (usuario) redirect('/panel');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10 lg:max-w-5xl lg:px-8">
      <Logotipo ancho={132} />

      <div className="flex flex-1 flex-col justify-center py-10 lg:grid lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
        <div>
          <p className="t-rotulo text-verde-txt">Organizá · Jugá · Compartí</p>
          <h1 className="t-display mt-3 text-[40px] lg:text-[64px]">
            ¿Querés jugar?
            <br />
            Encontrá con quién.
          </h1>
          <p className="mt-4 text-tinta-2 lg:text-lg">
            Armá el partido, invitá a tu gente, manejá cupos y reemplazos. O encontrá partidos,
            jugadores y grupos cerca tuyo.
          </p>
          <p className="t-rotulo mt-8 hidden lg:block">
            Fútbol · Básquet · Vóley · Rugby · Tenis · Pádel · Ciclismo y más
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 lg:mt-0">
          <Link href="/registro?puerta=grupo" className="tarjeta block p-4 transition-colors hover:border-borde-2">
            <span className="t-rotulo text-verde-txt">Ya tengo un grupo</span>
            <span className="mt-1 block font-semibold">Organizo partidos y controlo la asistencia</span>
          </Link>
          <Link href="/registro?puerta=jugar" className="tarjeta block p-4 transition-colors hover:border-borde-2">
            <span className="t-rotulo text-azul-txt">Busco con quién jugar</span>
            <span className="mt-1 block font-semibold">Encuentro partidos, jugadores y equipos cercanos</span>
          </Link>

          <p className="t-rotulo mt-5 lg:hidden">
            Fútbol · Básquet · Vóley · Rugby · Tenis · Pádel · Ciclismo y más
          </p>

          <p className="mt-3 text-sm text-tinta-2">
            ¿Tenés una cancha para alquilar?{' '}
            <Link href="/registro?puerta=cancha" className="font-semibold text-naranja-txt">
              Publicala en birteam
            </Link>
          </p>
        </div>
      </div>

      <p className="text-center text-sm text-tinta-2">
        ¿Ya tenés cuenta?{' '}
        <Link href="/entrar" className="font-semibold text-verde-txt">
          Entrá
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-tinta-3">
        <Link href="/terminos">Términos</Link> · <Link href="/privacidad">Privacidad</Link>
      </p>
    </main>
  );
}
