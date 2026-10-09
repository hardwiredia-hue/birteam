import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { Avatar } from '@/components/avatar';
import { AccesosRapidos } from '@/components/accesos';
import { prisma } from '@/lib/db';
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

  const [avisosSinLeer, mensajesSinLeer] = await Promise.all([
    prisma.notificacion.count({ where: { usuarioId: usuario.id, leidaEn: null } }),
    prisma.mensaje.count({ where: { destinatarioId: usuario.id, leidoEn: null } }),
  ]);

  // Móvil: columna única con barra inferior. Escritorio: barra lateral + pie de página.
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-24 pt-6 lg:max-w-5xl lg:px-8 lg:pb-0 lg:pt-6">
      {/* Cabecera de escritorio: logo a la izquierda; crear partido y usuario a la derecha. */}
      <header className="mb-8 hidden items-center justify-between lg:flex">
        <Link href="/panel">
          <Logotipo ancho={120} />
        </Link>
        <div className="flex items-center gap-5">
          <AccesosRapidos avisos={avisosSinLeer} mensajes={mensajesSinLeer} />
          <Link href="/crear" className="btn btn-primario btn-sm">
            + Crear partido
          </Link>
          <Link href="/perfil" className="flex items-center gap-2.5">
            <span className="text-sm font-semibold">{usuario.nombre}</span>
            <Avatar nombre={usuario.nombre} avatarUrl={usuario.avatarUrl} tam={36} />
          </Link>
        </div>
      </header>

      {/* El contenido estira y el pie queda siempre pegado al fondo. */}
      <div className="w-full flex-1 lg:flex lg:items-start lg:gap-12">
        <BarraLateral />
        <main className="min-w-0 flex-1 lg:max-w-2xl">{children}</main>
      </div>
      <PieDePagina />
      <BarraInferior />
    </div>
  );
}
