'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface Aviso {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string | null;
  url: string | null;
}

export function Avisos({ avisos }: { avisos: Aviso[] }) {
  const router = useRouter();
  const [limpiando, setLimpiando] = useState(false);

  if (avisos.length === 0) return null;

  async function marcarLeidas() {
    setLimpiando(true);
    await fetch('/api/notificaciones/leer', { method: 'POST' });
    router.refresh();
  }

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="t-rotulo">Avisos · {avisos.length}</p>
        <button
          type="button"
          className="text-xs font-semibold text-tinta-3"
          onClick={marcarLeidas}
          disabled={limpiando}
        >
          {limpiando ? '…' : 'Marcar leídos'}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {avisos.map((aviso) => {
          const contenido = (
            <>
              <p
                className="text-sm font-semibold"
                style={{ color: aviso.tipo === 'LUGAR_LIBERADO' ? 'var(--azul-txt)' : 'var(--tinta)' }}
              >
                {aviso.titulo}
              </p>
              {aviso.cuerpo ? <p className="mt-0.5 text-xs text-tinta-3">{aviso.cuerpo}</p> : null}
            </>
          );
          return aviso.url ? (
            <Link key={aviso.id} href={aviso.url} className="tarjeta block p-3.5">
              {contenido}
            </Link>
          ) : (
            <div key={aviso.id} className="tarjeta p-3.5">
              {contenido}
            </div>
          );
        })}
      </div>
    </section>
  );
}
