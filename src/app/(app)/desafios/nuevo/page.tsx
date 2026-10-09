import Link from 'next/link';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { gruposQueAdministro } from '@/lib/desafios';
import { FormularioDesafio } from './formulario';

export const metadata = { title: 'Nuevo desafío' };
export const dynamic = 'force-dynamic';

export default async function NuevoDesafio({
  searchParams,
}: {
  searchParams: Promise<{ rival?: string; grupo?: string }>;
}) {
  const { rival: rivalId, grupo: grupoId } = await searchParams;
  const usuario = (await usuarioActual())!;
  const misGrupos = await gruposQueAdministro(usuario.id);

  if (misGrupos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="t-display text-[26px]">Nuevo desafío</h1>
        <p className="tarjeta p-4 text-sm text-tinta-2">
          Desafían los admins de un grupo. Creá el tuyo y volvé.
        </p>
        <Link href="/grupos/nuevo" className="btn btn-primario">Crear un grupo</Link>
      </div>
    );
  }

  const deporteIds = [...new Set(misGrupos.map((g) => g.deporteId))];
  const [candidatos, canchas, deportes] = await Promise.all([
    prisma.grupo.findMany({
      where: { deporteId: { in: deporteIds }, id: { notIn: misGrupos.map((g) => g.id) } },
      select: {
        id: true,
        nombre: true,
        ciudad: true,
        deporteId: true,
        _count: { select: { miembros: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take: 100,
    }),
    prisma.cancha.findMany({
      where: { activa: true, deporteId: { in: deporteIds }, dueno: { suscripcionHasta: { gt: new Date() } } },
      select: { id: true, nombre: true, direccion: true, deporteId: true },
      orderBy: { creadoEn: 'desc' },
      take: 40,
    }),
    prisma.deporte.findMany({ where: { id: { in: deporteIds } }, select: { id: true, nombre: true } }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="t-display text-[26px]">Nuevo desafío</h1>
        <p className="mt-1 text-sm text-tinta-2">
          Elegí al rival o publicalo abierto para que lo acepte cualquier grupo del mismo
          deporte.
        </p>
      </header>
      <FormularioDesafio
        misGrupos={misGrupos.map((g) => ({
          ...g,
          deporte: deportes.find((d) => d.id === g.deporteId)?.nombre ?? '',
        }))}
        candidatos={candidatos.map((g) => ({
          id: g.id,
          nombre: g.nombre,
          ciudad: g.ciudad,
          deporteId: g.deporteId,
          miembros: g._count.miembros,
        }))}
        canchas={canchas}
        grupoInicial={misGrupos.some((g) => g.id === grupoId) ? grupoId! : null}
        rivalInicial={candidatos.some((g) => g.id === rivalId) ? rivalId! : null}
      />
    </div>
  );
}
