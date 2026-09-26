import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { formatearPlata } from '@/lib/formato';
import { Logotipo } from '@/components/marca';

export const metadata = { title: 'Te invitaron a jugar' };
export const dynamic = 'force-dynamic';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/**
 * La vista del link de WhatsApp: cualquiera la abre SIN cuenta. Para
 * confirmar "Voy" crea su usuario en 30 segundos y cae directo al partido.
 * Cada partido compartido trae jugadores nuevos (ESQUEMA.md §3.1).
 */
export default async function PartidoPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const partido = await prisma.partido.findUnique({
    where: { tokenPublico: token },
    include: {
      deporte: true,
      organizador: { select: { nombre: true, usuario: true } },
      participaciones: { where: { estado: 'VOY' }, select: { id: true } },
    },
  });
  if (!partido || partido.estado === 'CANCELADO') notFound();

  const usuario = await usuarioActual();
  const voy = partido.participaciones.length;
  const lugares = Math.max(0, partido.cupo - voy);
  const hora = partido.fecha.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  const volver = `/partidos/${partido.id}`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Logotipo ancho={100} />

      <div className="flex flex-1 flex-col justify-center gap-5 py-8">
        <p className="t-rotulo text-verde-txt">Te invitaron a jugar</p>

        <div className="tarjeta flex flex-col gap-4 p-5">
          <p className="t-rotulo text-verde-txt">
            {partido.deporte.nombre}
            {partido.recurrenteSemanal ? ' · se repite' : ''}
          </p>
          <div>
            <p className="t-display text-[30px]">
              {DIAS[partido.fecha.getDay()]} {hora}
            </p>
            <p className="mt-1 text-sm text-tinta-2">
              {partido.lugarNombre}
              {partido.ciudad ? ` · ${partido.ciudad}` : ''}
            </p>
            <p className="mt-0.5 text-[13px] text-tinta-3">
              Organiza {partido.organizador.nombre}
            </p>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="t-rotulo tabular">{voy}/{partido.cupo} confirmados</span>
            <span className="t-rotulo tabular" style={lugares > 0 ? { color: 'var(--verde-txt)' } : undefined}>
              {lugares > 0 ? `quedan ${lugares} lugares` : 'cupo lleno · hay lista de espera'}
            </span>
          </div>
          <div className="barra-progreso">
            <i style={{ width: `${Math.min(100, (voy / partido.cupo) * 100)}%` }} />
          </div>
          {partido.costoPorJugador ? (
            <p className="text-sm text-tinta-2 tabular">
              {formatearPlata(partido.costoPorJugador)} por jugador
            </p>
          ) : null}
        </div>

        {usuario ? (
          <Link href={volver} className="btn btn-primario">
            Abrir el partido y confirmar
          </Link>
        ) : (
          <>
            <Link href={`/registro?volver=${encodeURIComponent(volver)}`} className="btn btn-primario">
              Sumate en 30 segundos
            </Link>
            <p className="text-center text-sm text-tinta-2">
              ¿Ya tenés cuenta?{' '}
              <Link href={`/entrar?volver=${encodeURIComponent(volver)}`} className="font-semibold text-verde-txt">
                Entrá y confirmá
              </Link>
            </p>
          </>
        )}
      </div>

      <p className="t-rotulo text-center">birteam · ¿Querés jugar? Encontrá con quién.</p>
    </main>
  );
}
