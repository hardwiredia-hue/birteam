import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { FormularioCancha } from '@/components/formulario-cancha';

export const metadata = { title: 'Editar cancha' };
export const dynamic = 'force-dynamic';

export default async function EditarCancha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = (await usuarioActual())!;

  const cancha = await prisma.cancha.findUnique({ where: { id } });
  if (!cancha) notFound();
  if (cancha.duenoId !== usuario.id && usuario.rol !== 'ADMIN') notFound();

  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true },
  });

  let fotos: string[] = [];
  try {
    fotos = JSON.parse(cancha.fotos);
  } catch {
    fotos = [];
  }
  let diasDisponibles: number[] = [0, 1, 2, 3, 4, 5, 6];
  try {
    diasDisponibles = JSON.parse(cancha.diasDisponibles);
  } catch {
    diasDisponibles = [0, 1, 2, 3, 4, 5, 6];
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="t-pantalla">Editar cancha</h1>
      <FormularioCancha
        deportes={deportes}
        cancha={{
          id: cancha.id,
          nombre: cancha.nombre,
          descripcion: cancha.descripcion,
          deporteId: cancha.deporteId,
          direccion: cancha.direccion,
          ciudad: cancha.ciudad,
          provincia: cancha.provincia,
          telefono: cancha.telefono,
          precioPorHora: cancha.precioPorHora,
          fotos,
          diasDisponibles,
          horaApertura: cancha.horaApertura,
          horaCierre: cancha.horaCierre,
          duracionTurno: cancha.duracionTurno,
          reservasOnline: cancha.reservasOnline,
          activa: cancha.activa,
        }}
      />
    </div>
  );
}
