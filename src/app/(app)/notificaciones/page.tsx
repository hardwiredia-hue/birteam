import Link from 'next/link';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { Avisos } from '../panel/avisos';

export const metadata = { title: 'Notificaciones' };
export const dynamic = 'force-dynamic';

/** Todas las notificaciones: las nuevas arriba, las ya leídas apagadas abajo. */
export default async function Notificaciones() {
  const usuario = (await usuarioActual())!;

  const notificaciones = await prisma.notificacion.findMany({
    where: { usuarioId: usuario.id },
    orderBy: { creadoEn: 'desc' },
    take: 60,
  });
  const nuevas = notificaciones.filter((n) => n.leidaEn === null);
  const leidas = notificaciones.filter((n) => n.leidaEn !== null);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="t-pantalla">Notificaciones</h1>

      {notificaciones.length === 0 ? (
        <div className="tarjeta p-5">
          <p className="text-sm text-tinta-2">
            Por ahora nada. Acá van a caer los avisos de tus partidos, lugares liberados,
            comentarios, me gusta y seguidores nuevos.
          </p>
        </div>
      ) : null}

      <Avisos
        avisos={nuevas.map((n) => ({
          id: n.id,
          tipo: n.tipo,
          titulo: n.titulo,
          cuerpo: n.cuerpo,
          url: n.url,
        }))}
      />

      {leidas.length > 0 ? (
        <section>
          <p className="t-rotulo mb-2">Anteriores</p>
          <div className="flex flex-col gap-2">
            {leidas.map((aviso) => {
              const contenido = (
                <>
                  <p className="text-sm font-semibold text-tinta-2">{aviso.titulo}</p>
                  {aviso.cuerpo ? <p className="mt-0.5 text-xs text-tinta-3">{aviso.cuerpo}</p> : null}
                  <p className="t-rotulo mt-1">
                    {aviso.creadoEn.toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'America/Argentina/Buenos_Aires',
                    })}
                  </p>
                </>
              );
              return aviso.url ? (
                <Link key={aviso.id} href={aviso.url} className="tarjeta block p-3.5 opacity-70">
                  {contenido}
                </Link>
              ) : (
                <div key={aviso.id} className="tarjeta p-3.5 opacity-70">
                  {contenido}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
