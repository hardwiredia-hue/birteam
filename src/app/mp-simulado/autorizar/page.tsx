import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';

export const metadata = { title: 'Simulador · conectar cuenta' };
export const dynamic = 'force-dynamic';

/** Hace de pantalla de autorización de Mercado Pago (OAuth) en el simulador. */
export default async function AutorizarSimulado({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const usuario = await usuarioActual();
  if (!usuario) redirect('/entrar');

  return (
    <div className="flex flex-col gap-4 rounded-[10px] bg-white p-6 shadow-sm">
      <p className="text-lg font-bold">Conectar con birteam</p>
      <p className="text-sm" style={{ color: '#555' }}>
        birteam quiere cobrar turnos a nombre de <strong>{usuario.complejoNombre ?? usuario.nombre}</strong>.
        En el Mercado Pago real acá iniciarías sesión con tu cuenta y aceptarías los permisos.
      </p>
      <a
        href={`/api/mercadopago/volver?code=simulado&state=${encodeURIComponent(state ?? '')}`}
        className="rounded-[6px] px-4 py-3 text-center text-sm font-bold text-white"
        style={{ background: '#009ee3' }}
      >
        Autorizar (simulado)
      </a>
      <a href="/complejo" className="text-center text-sm" style={{ color: '#555' }}>
        Cancelar
      </a>
    </div>
  );
}
