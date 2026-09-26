import Link from 'next/link';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { idsBloqueados } from '@/lib/bloqueos';

export const metadata = { title: 'Mensajes' };
export const dynamic = 'force-dynamic';

export default async function Mensajes() {
  const usuario = (await usuarioActual())!;
  const ocultos = await idsBloqueados(usuario.id);

  // Las conversaciones: el último mensaje con cada persona.
  const mensajes = await prisma.mensaje.findMany({
    where: {
      OR: [{ autorId: usuario.id, destinatarioId: { not: null } }, { destinatarioId: usuario.id }],
      ...(ocultos.length > 0
        ? { AND: [{ autorId: { notIn: ocultos } }, { destinatarioId: { notIn: ocultos } }] }
        : {}),
    },
    include: {
      autor: { select: { id: true, nombre: true, usuario: true } },
      destinatario: { select: { id: true, nombre: true, usuario: true } },
    },
    orderBy: { creadoEn: 'desc' },
    take: 200,
  });

  const conversaciones = new Map<
    string,
    { otro: { id: string; nombre: string; usuario: string }; ultimo: string; mio: boolean; sinLeer: number }
  >();
  for (const mensaje of mensajes) {
    const otro = mensaje.autorId === usuario.id ? mensaje.destinatario! : mensaje.autor;
    const existente = conversaciones.get(otro.id);
    const sinLeer =
      mensaje.destinatarioId === usuario.id && mensaje.leidoEn === null ? 1 : 0;
    if (existente) {
      existente.sinLeer += sinLeer;
    } else {
      conversaciones.set(otro.id, {
        otro,
        ultimo: mensaje.texto,
        mio: mensaje.autorId === usuario.id,
        sinLeer,
      });
    }
  }

  const lista = [...conversaciones.values()];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="t-pantalla">Mensajes</h1>

      {lista.length === 0 ? (
        <div className="tarjeta p-5">
          <p className="text-sm text-tinta-2">
            Todavía no hablaste con nadie por acá. Entrá al perfil de un jugador y tocá
            "Mensaje" — para coordinar un partido, sumar un refuerzo o lo que haga falta.
          </p>
          <Link href="/explorar?tab=jugadores" className="btn btn-secundario mt-4">
            Buscar jugadores
          </Link>
        </div>
      ) : (
        <div>
          {lista.map((conversacion) => (
            <Link
              key={conversacion.otro.id}
              href={`/mensajes/${conversacion.otro.usuario}`}
              className="flex items-center gap-3 border-b border-borde py-3 last:border-b-0"
            >
              <span className="avatar h-10 w-10 text-xs">
                {conversacion.otro.nombre.split(' ').map((parte) => parte[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{conversacion.otro.nombre}</p>
                <p className="truncate text-xs text-tinta-3">
                  {conversacion.mio ? 'Vos: ' : ''}
                  {conversacion.ultimo}
                </p>
              </div>
              {conversacion.sinLeer > 0 ? (
                <span
                  className="rounded-[6px] px-2 py-0.5 text-[11px] font-bold tabular"
                  style={{ background: 'var(--verde)', color: 'var(--sobre-verde)' }}
                >
                  {conversacion.sinLeer}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
