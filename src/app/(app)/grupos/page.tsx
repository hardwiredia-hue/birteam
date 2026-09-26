import Link from 'next/link';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';

export const metadata = { title: 'Grupos' };
export const dynamic = 'force-dynamic';

export default async function Grupos() {
  const usuario = (await usuarioActual())!;

  const membresias = await prisma.miembroGrupo.findMany({
    where: { usuarioId: usuario.id },
    include: {
      grupo: {
        include: {
          deporte: true,
          _count: { select: { miembros: true } },
          partidos: {
            where: { fecha: { gte: new Date() }, estado: { in: ['ARMANDOSE', 'CONFIRMADO'] } },
            orderBy: { fecha: 'asc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { unidoEn: 'asc' },
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="t-pantalla">Grupos</h1>
        <Link href="/grupos/nuevo" className="btn btn-primario btn-sm">Crear grupo</Link>
      </header>

      {membresias.length === 0 ? (
        <div className="tarjeta flex flex-col gap-4 p-5">
          <p className="text-sm text-tinta-2">
            Tu gente, en un solo lugar: armás el grupo una vez y organizar cada partido cuesta un
            toque. Los invitás con un link por WhatsApp.
          </p>
          <Link href="/grupos/nuevo" className="btn btn-primario">Creá tu grupo</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {membresias.map(({ grupo, rol }) => (
            <Link key={grupo.id} href={`/grupos/${grupo.id}`} className="tarjeta flex flex-col gap-2 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="t-rotulo text-verde-txt">{grupo.deporte.nombre}</span>
                {rol === 'ADMIN' ? <span className="t-rotulo">admin</span> : null}
              </div>
              <p className="t-display text-[19px]">{grupo.nombre}</p>
              <p className="text-xs text-tinta-3">
                {grupo._count.miembros} {grupo._count.miembros === 1 ? 'miembro' : 'miembros'}
                {grupo.ciudad ? ` · ${grupo.ciudad}` : ''}
                {grupo.partidos[0]
                  ? ` · próximo: ${grupo.partidos[0].fecha.toLocaleDateString('es-AR', {
                      weekday: 'long',
                      timeZone: 'America/Argentina/Buenos_Aires',
                    })}`
                  : ''}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
