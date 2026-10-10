import { notFound } from 'next/navigation';
import { pagosSimulados } from '@/lib/mercadopago';

/**
 * Simulador de Mercado Pago (solo staging y desarrollo, prendido desde el
 * backoffice). Se ve distinto a propósito: nadie lo tiene que confundir con
 * el checkout real.
 */
export default async function LayoutSimulador({ children }: { children: React.ReactNode }) {
  if (!(await pagosSimulados())) notFound();
  return (
    <div className="min-h-dvh" style={{ background: '#e9eef5', color: '#1a1a1a' }}>
      <div className="px-4 py-2 text-center text-xs font-bold" style={{ background: '#f5c400', color: '#1a1a1a' }}>
        SIMULADOR DE PAGOS · birteam staging · no es Mercado Pago y no se cobra nada
      </div>
      <main className="mx-auto flex max-w-md flex-col gap-4 px-5 py-8">{children}</main>
    </div>
  );
}
