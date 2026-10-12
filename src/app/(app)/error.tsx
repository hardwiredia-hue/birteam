'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/** Algo falló al cargar esta pantalla: se puede reintentar sin perder la navegación. */
export default function ErrorDePantalla({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Solo a la consola: nunca se le muestran detalles técnicos al usuario.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4 py-10">
      <p className="t-rotulo text-naranja-txt">Algo salió mal</p>
      <h1 className="t-pantalla">No pudimos cargar esta pantalla</h1>
      <p className="text-sm text-tinta-2">
        Puede ser la conexión o un problema nuestro. Probá de nuevo; si sigue, escribinos a
        hola@birteam.com.
      </p>
      {error.digest ? <p className="t-rotulo">Código: {error.digest}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primario" onClick={reset}>
          Reintentar
        </button>
        <Link href="/panel" className="btn btn-secundario">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
