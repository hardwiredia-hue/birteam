import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Logotipo } from '@/components/marca';
import { FormularioRestablecer } from './formulario';

export const metadata = { title: 'Nueva contraseña' };
export const dynamic = 'force-dynamic';

export default async function Restablecer({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const registro = await prisma.tokenRecuperacion.findUnique({ where: { token } });
  const vigente = Boolean(registro && !registro.usadoEn && registro.expiraEn > new Date());

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Link href="/">
        <Logotipo ancho={110} />
      </Link>
      <div className="flex flex-1 flex-col justify-center py-8">
        {vigente ? (
          <>
            <h1 className="t-display text-[30px]">Creá tu nueva<br />contraseña</h1>
            <FormularioRestablecer token={token} />
          </>
        ) : (
          <>
            <h1 className="t-display text-[30px]">Este link<br />ya no sirve</h1>
            <p className="mt-2 text-sm text-tinta-2">
              Venció (dura 1 hora) o ya se usó. Pedí uno nuevo y listo.
            </p>
            <Link href="/recuperar" className="btn btn-primario mt-6">Pedir otro link</Link>
          </>
        )}
      </div>
    </main>
  );
}
