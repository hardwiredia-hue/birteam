import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { sitioEnConstruccion } from '@/lib/sitio';
import { Logotipo } from '@/components/marca';
import { PaginaConstruccion } from '@/components/construccion';
import { FormularioCompletar } from './formulario';

export const metadata = { title: 'Completá tu cuenta' };
export const dynamic = 'force-dynamic';

export default async function CompletarRegistro({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const usuario = await usuarioActual();
  if ((await sitioEnConstruccion()) && usuario?.rol !== 'ADMIN') {
    return <PaginaConstruccion />;
  }
  if (usuario) redirect('/panel');

  const pendiente = token
    ? await prisma.tokenGoogle.findUnique({ where: { token } })
    : null;
  if (!pendiente || pendiente.expiraEn < new Date()) {
    redirect('/entrar?google=vencido');
  }

  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true },
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Link href="/">
        <Logotipo ancho={110} />
      </Link>

      <div className="py-8">
        <p className="t-rotulo text-verde-txt">Google conectado ✓ · {pendiente.email}</p>
        <h1 className="t-display mt-2 text-[32px]">
          Último paso:
          <br />
          completá tu cuenta
        </h1>
        <p className="mt-2 text-tinta-2">
          Elegí tu @usuario y contanos lo justo para encontrarte juego.
        </p>

        <FormularioCompletar
          token={pendiente.token}
          nombreInicial={pendiente.nombre}
          deportes={deportes}
        />
      </div>
    </main>
  );
}
