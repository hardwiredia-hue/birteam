import Link from 'next/link';
import Form from 'next/form';
import { prisma } from '@/lib/db';
import { adminActual } from '@/lib/admin';
import { BotonRol, BotonSuscripcion } from './acciones';

export const metadata = { title: 'Usuarios' };
export const dynamic = 'force-dynamic';

export default async function Usuarios({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const admin = (await adminActual())!;
  const filtro = q?.trim();

  const usuarios = await prisma.usuario.findMany({
    where: filtro
      ? {
          OR: [
            { nombre: { contains: filtro } },
            { usuario: { contains: filtro.toLowerCase() } },
            { email: { contains: filtro.toLowerCase() } },
            { ciudad: { contains: filtro } },
          ],
        }
      : undefined,
    orderBy: { creadoEn: 'desc' },
    take: 50,
    select: {
      id: true,
      nombre: true,
      usuario: true,
      email: true,
      ciudad: true,
      rol: true,
      tipoCuenta: true,
      suscripcionHasta: true,
      creadoEn: true,
    },
  });
  const ahora = new Date();

  return (
    <div className="flex flex-col gap-4">
      <Form action="/admin/usuarios" className="flex gap-2">
        <input
          id="buscar-usuarios"
          name="q"
          className="campo"
          placeholder="Buscar por nombre, usuario, email o ciudad…"
          defaultValue={q ?? ''}
        />
        <button type="submit" className="btn btn-secundario btn-sm">Buscar</button>
      </Form>

      <div>
        {usuarios.map((usuario) => (
          <div key={usuario.id} className="flex items-center gap-3 border-b border-borde py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                <Link href={`/jugadores/${usuario.usuario}`}>{usuario.nombre}</Link>
                {usuario.rol === 'ADMIN' ? (
                  <span className="t-rotulo ml-2 text-verde-txt">admin</span>
                ) : null}
                {usuario.tipoCuenta === 'CANCHA' ? (
                  <span
                    className="t-rotulo ml-2"
                    style={{
                      color:
                        usuario.suscripcionHasta && usuario.suscripcionHasta > ahora
                          ? 'var(--naranja-txt)'
                          : 'var(--tinta-3)',
                    }}
                  >
                    cancha{' '}
                    {usuario.suscripcionHasta && usuario.suscripcionHasta > ahora
                      ? `· hasta ${usuario.suscripcionHasta.toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          timeZone: 'America/Argentina/Buenos_Aires',
                        })}`
                      : '· sin suscripción'}
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-tinta-3">
                @{usuario.usuario} · {usuario.email}
                {usuario.ciudad ? ` · ${usuario.ciudad}` : ''} ·{' '}
                {usuario.creadoEn.toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'America/Argentina/Buenos_Aires',
                })}
              </p>
            </div>
            {usuario.tipoCuenta === 'CANCHA' ? (
              <BotonSuscripcion
                usuarioId={usuario.id}
                activa={Boolean(usuario.suscripcionHasta && usuario.suscripcionHasta > ahora)}
              />
            ) : null}
            {usuario.id !== admin.id ? (
              <BotonRol usuarioId={usuario.id} esAdmin={usuario.rol === 'ADMIN'} />
            ) : (
              <span className="t-rotulo">vos</span>
            )}
          </div>
        ))}
      </div>
      {usuarios.length === 50 ? (
        <p className="text-xs text-tinta-3">Se muestran los primeros 50. Afiná la búsqueda.</p>
      ) : null}
    </div>
  );
}
