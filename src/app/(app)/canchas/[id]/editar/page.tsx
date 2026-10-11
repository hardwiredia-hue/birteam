import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { FormularioCancha } from '@/components/formulario-cancha';
import { canchaParaFormulario } from '@/lib/cancha-formulario';
import { comisionPorcentaje, duenoCobraOnline } from '@/lib/mercadopago';

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
    select: { id: true, nombre: true, slug: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="t-pantalla">Editar cancha</h1>
      <FormularioCancha
        deportes={deportes}
        mercadoPago={{
          conectada: await duenoCobraOnline(cancha.duenoId),
          comision: await comisionPorcentaje(),
        }}
        cancha={canchaParaFormulario(cancha)}
      />
    </div>
  );
}
