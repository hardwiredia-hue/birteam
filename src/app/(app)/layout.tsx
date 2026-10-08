import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { sitioEnConstruccion } from '@/lib/sitio';
import { BarraInferior } from '@/components/barra-inferior';
import { BarraLateral } from '@/components/barra-lateral';
import { Logotipo } from '@/components/marca';
import { PaginaConstruccion } from '@/components/construccion';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect('/entrar');
  if (usuario.rol !== 'ADMIN' && (await sitioEnConstruccion())) {
    return <PaginaConstruccion />;
  }

  // Móvil: columna única con barra inferior. Escritorio: barra lateral + contenido ancho.
  return (
    <div className="mx-auto w-full max-w-md px-5 pb-24 pt-6 lg:flex lg:max-w-5xl lg:items-start lg:gap-12 lg:px-8 lg:pb-12 lg:pt-8">
      <BarraLateral logo={<Logotipo ancho={120} />} />
      <main className="min-w-0 flex-1 lg:max-w-2xl">{children}</main>
      <BarraInferior />
    </div>
  );
}
