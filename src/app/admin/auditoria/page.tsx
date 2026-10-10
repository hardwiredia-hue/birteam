import Link from 'next/link';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Auditoría' };
export const dynamic = 'force-dynamic';

const ROTULOS: Record<string, string> = {
  ROL: 'Cambio de rol',
  SUSCRIPCION: 'Suscripción',
  VERIFICACION: 'Verificación de titularidad',
  DENUNCIA: 'Denuncia resuelta',
  DEPORTE_ALTA: 'Deporte nuevo',
  CIUDAD_ALTA: 'Ciudad nueva',
  CIUDAD_BAJA: 'Ciudad borrada',
  MARCA_CAMBIO: 'Marca cambiada',
  MARCA_RESTAURADA: 'Marca restaurada',
  EN_CONSTRUCCION: 'Sitio en construcción',
  COMISION: 'Comisión',
  SIMULADOR_PAGOS: 'Simulador de pagos',
};

/** Quién hizo qué en el backoffice. Solo lectura: no se edita ni se borra desde acá. */
export default async function Auditoria({ searchParams }: { searchParams: Promise<{ accion?: string }> }) {
  const { accion } = await searchParams;
  const registros = await prisma.registroAdmin.findMany({
    where: accion ? { accion } : {},
    orderBy: { creadoEn: 'desc' },
    take: 200,
  });
  // Cuando el objetivo es un usuario, se muestra su @usuario.
  const ids = [...new Set(registros.filter((r) => ['ROL', 'SUSCRIPCION', 'VERIFICACION'].includes(r.accion)).map((r) => r.objetivo!).filter(Boolean))];
  const usuarios = ids.length
    ? await prisma.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, usuario: true } })
    : [];
  const nombre = new Map(usuarios.map((u) => [u.id, `@${u.usuario}`]));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-tinta-2">
        Cada acción sensible del backoffice queda registrada con quién la hizo y cuándo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/auditoria" className={!accion ? 'chip-sel chip-sel-activo' : 'chip-sel'}>
          Todo
        </Link>
        {Object.entries(ROTULOS).map(([clave, rotulo]) => (
          <Link
            key={clave}
            href={`/admin/auditoria?accion=${clave}`}
            className={accion === clave ? 'chip-sel chip-sel-activo' : 'chip-sel'}
          >
            {rotulo}
          </Link>
        ))}
      </div>
      {registros.length === 0 ? (
        <p className="tarjeta p-4 text-sm text-tinta-2">Sin registros todavía.</p>
      ) : (
        <div className="flex flex-col">
          {registros.map((registro) => (
            <div key={registro.id} className="flex flex-wrap items-baseline gap-x-2 border-b border-borde py-2 text-sm">
              <span className="text-xs tabular text-tinta-3">
                {registro.creadoEn.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
              </span>
              <span className="font-semibold">@{registro.adminUsuario}</span>
              <span>{ROTULOS[registro.accion] ?? registro.accion}</span>
              {registro.objetivo ? (
                <span className="text-tinta-2">{nombre.get(registro.objetivo) ?? registro.objetivo}</span>
              ) : null}
              {registro.detalle ? <span className="text-tinta-3">· {registro.detalle}</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
