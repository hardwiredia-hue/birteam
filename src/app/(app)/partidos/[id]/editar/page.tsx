import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { FormularioEditarPartido } from './formulario';

export const metadata = { title: 'Editar partido' };
export const dynamic = 'force-dynamic';

export default async function EditarPartido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = (await usuarioActual())!;

  const partido = await prisma.partido.findUnique({
    where: { id },
    include: { deporte: true, participaciones: { where: { estado: 'VOY' }, select: { id: true } } },
  });
  if (!partido) notFound();
  const organizo = partido.organizadorId === usuario.id || partido.coOrganizadorId === usuario.id;
  if (!organizo || partido.estado === 'JUGADO' || partido.estado === 'CANCELADO') {
    redirect(`/partidos/${id}`);
  }

  // La fecha en hora argentina para el input datetime-local.
  const enArgentina = new Date(partido.fecha.getTime() - 3 * 3600 * 1000);
  const valorFecha = enArgentina.toISOString().slice(0, 16);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="t-rotulo text-verde-txt">{partido.deporte.nombre}</p>
        <h1 className="t-display mt-1 text-[26px]">Editar partido</h1>
        <p className="mt-1 text-xs text-tinta-3">
          Si cambiás el día, la hora o la cancha, todos los anotados reciben el aviso.
        </p>
      </div>
      <FormularioEditarPartido
        partidoId={partido.id}
        confirmados={partido.participaciones.length}
        inicial={{
          fecha: valorFecha,
          lugarNombre: partido.lugarNombre,
          direccion: partido.direccion,
          lugarTelefono: partido.lugarTelefono,
          cupo: partido.cupo,
          minimo: partido.minimo,
          costoPorJugador: partido.costoPorJugador,
          visibilidad: partido.visibilidad,
          recurrenteSemanal: partido.recurrenteSemanal,
        }}
      />
    </div>
  );
}
