import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { EditorDeportes } from './editor';

export const metadata = { title: 'Perfil deportivo' };
export const dynamic = 'force-dynamic';

export default async function PerfilDeportivo() {
  const usuario = (await usuarioActual())!;
  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true },
  });

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="t-display text-[26px]">Perfil deportivo</h1>
        <p className="mt-1 text-sm text-tinta-2">
          Qué jugás, en qué posición y a qué nivel. Sirve para que te inviten a partidos
          parejos y para armar equipos.
        </p>
      </header>
      <EditorDeportes
        deportes={deportes}
        inicial={usuario.deportes.map((relacion) => ({
          deporteId: relacion.deporteId,
          principal: relacion.principal,
          posicion: relacion.posicion,
          nivel: relacion.nivel,
        }))}
      />
    </div>
  );
}
