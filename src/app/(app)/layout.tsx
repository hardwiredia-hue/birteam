import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { Avatar } from '@/components/avatar';
import { sitioEnConstruccion } from '@/lib/sitio';
import { BarraInferior } from '@/components/barra-inferior';
import { BarraLateral } from '@/components/barra-lateral';
import { PieDePagina } from '@/components/pie-de-pagina';
import { Logotipo } from '@/components/marca';
import { PaginaConstruccion } from '@/components/construccion';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect('/entrar');
  if (usuario.rol !== 'ADMIN' && (await sitioEnConstruccion())) {
    return <PaginaConstruccion />;
  }

  // Móvil: columna única con barra inferior. Escritorio: barra lateral + pie de página.
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-24 pt-6 lg:max-w-5xl lg:px-8 lg:pb-0 lg:pt-6">
      {/* Cabecera de escritorio: crear partido y el usuario, arriba a la derecha. */}
      <header className="mb-8 hidden items-center justify-end gap-5 lg:flex">
        <Link href="/crear" className="btn btn-primario btn-sm">
          + Crear partido
        </Link>
        <Link href="/perfil" className="flex items-center gap-2.5">
          <span className="text-sm font-semibold">{usuario.nombre}</span>
          <Avatar nombre={usuario.nombre} avatarUrl={usuario.avatarUrl} tam={36} />
        </Link>
      </header>

      {/* El contenido estira y el pie queda siempre pegado al fondo. */}
      <div className="w-full flex-1 lg:flex lg:items-start lg:gap-12">
        <BarraLateral logo={<Logotipo ancho={120} />} />
        <main className="min-w-0 flex-1 lg:max-w-2xl">{children}</main>
      </div>
      <PieDePagina />
      <BarraInferior />
    </div>
  );
}
