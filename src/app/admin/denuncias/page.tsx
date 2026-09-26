import Link from 'next/link';
import { prisma } from '@/lib/db';
import { MOTIVOS_DENUNCIA } from '@/lib/constantes';
import { AccionesDenuncia } from './acciones';

export const metadata = { title: 'Denuncias' };
export const dynamic = 'force-dynamic';

const ROTULOS = Object.fromEntries(MOTIVOS_DENUNCIA.map((m) => [m.valor, m.rotulo]));

export default async function Denuncias() {
  const denuncias = await prisma.denuncia.findMany({
    include: {
      denunciante: { select: { nombre: true, usuario: true } },
      denunciado: { select: { nombre: true, usuario: true } },
    },
    orderBy: [{ estado: 'asc' }, { creadoEn: 'desc' }],
    take: 100,
  });

  const pendientes = denuncias.filter((d) => d.estado === 'PENDIENTE');
  const resueltas = denuncias.filter((d) => d.estado !== 'PENDIENTE');

  return (
    <div className="flex flex-col gap-5">
      <section>
        <p className="t-rotulo mb-2">Pendientes · {pendientes.length}</p>
        {pendientes.length === 0 ? (
          <p className="tarjeta p-4 text-sm text-tinta-2">Bandeja limpia. Así nos gusta.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendientes.map((denuncia) => (
              <div key={denuncia.id} className="tarjeta flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--rojo)' }}>
                    {ROTULOS[denuncia.motivo] ?? denuncia.motivo}
                  </span>
                  <span className="t-rotulo">
                    {denuncia.creadoEn.toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'America/Argentina/Buenos_Aires',
                    })}
                  </span>
                </div>
                <p className="text-sm text-tinta-2">
                  <b className="text-tinta">@{denuncia.denunciante.usuario}</b> denunció{' '}
                  {denuncia.denunciado ? (
                    <Link href={`/jugadores/${denuncia.denunciado.usuario}`} className="font-semibold text-azul-txt">
                      @{denuncia.denunciado.usuario}
                    </Link>
                  ) : denuncia.partidoId ? (
                    <Link href={`/partidos/${denuncia.partidoId}`} className="font-semibold text-azul-txt">
                      un partido
                    </Link>
                  ) : (
                    'algo'
                  )}
                </p>
                {denuncia.detalle ? (
                  <p className="rounded-[6px] border border-borde bg-fondo px-3 py-2 text-sm text-tinta-2">
                    “{denuncia.detalle}”
                  </p>
                ) : null}
                <AccionesDenuncia denunciaId={denuncia.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      {resueltas.length > 0 ? (
        <section>
          <p className="t-rotulo mb-2">Cerradas · {resueltas.length}</p>
          <div>
            {resueltas.map((denuncia) => (
              <div key={denuncia.id} className="flex items-baseline gap-3 border-b border-borde py-2 text-sm last:border-b-0">
                <span className="text-tinta-3">{ROTULOS[denuncia.motivo] ?? denuncia.motivo}</span>
                <span className="flex-1 truncate text-tinta-2">
                  @{denuncia.denunciante.usuario} → {denuncia.denunciado ? `@${denuncia.denunciado.usuario}` : 'partido'}
                </span>
                <span
                  className="t-rotulo"
                  style={{ color: denuncia.estado === 'RESUELTA' ? 'var(--verde-txt)' : undefined }}
                >
                  {denuncia.estado === 'RESUELTA' ? 'resuelta' : 'descartada'}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
