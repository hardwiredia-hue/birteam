import Link from 'next/link';
import { redirect } from 'next/navigation';
import { adminActual } from '@/lib/admin';

const SECCIONES = [
  { href: '/admin', rotulo: 'Métricas' },
  { href: '/admin/denuncias', rotulo: 'Denuncias' },
  { href: '/admin/usuarios', rotulo: 'Usuarios' },
  { href: '/admin/deportes', rotulo: 'Deportes' },
  { href: '/admin/geografia', rotulo: 'Geografía' },
  { href: '/admin/marca', rotulo: 'Marca' },
];

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const admin = await adminActual();
  if (!admin) redirect('/panel');

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-6">
      <header className="mb-5 flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h1 className="t-display text-[22px]">Backoffice</h1>
          <Link href="/panel" className="text-xs font-semibold text-tinta-3">← Volver a la app</Link>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {SECCIONES.map((seccion) => (
            <Link key={seccion.href} href={seccion.href} className="chip-sel whitespace-nowrap">
              {seccion.rotulo}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
