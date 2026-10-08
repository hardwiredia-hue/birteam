import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { sitioEnConstruccion } from '@/lib/sitio';
import { BarraInferior } from '@/components/barra-inferior';
import { PaginaConstruccion } from '@/components/construccion';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect('/entrar');
  if (usuario.rol !== 'ADMIN' && (await sitioEnConstruccion())) {
    return <PaginaConstruccion />;
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-24 pt-6">
      {children}
      <BarraInferior />
    </div>
  );
}
