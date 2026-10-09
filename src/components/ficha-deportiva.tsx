import { ROTULOS_NIVEL } from '@/lib/constantes';

interface DeporteDelPerfil {
  deporteId: string;
  principal: boolean;
  posicion: string | null;
  nivel: string | null;
  deporte: { nombre: string };
}

/** Los deportes de un jugador con su posición y nivel, el principal primero. */
export function FichaDeportiva({ deportes }: { deportes: DeporteDelPerfil[] }) {
  const ordenados = [...deportes].sort((a, b) => Number(b.principal) - Number(a.principal));
  return (
    <div className="flex flex-col gap-2">
      {ordenados.map((relacion) => (
        <div
          key={relacion.deporteId}
          className="tarjeta flex items-center justify-between gap-3 px-4 py-3"
          style={relacion.principal ? { borderColor: 'var(--verde-txt)' } : undefined}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {relacion.deporte.nombre}
              {relacion.principal ? <span className="ml-1.5 text-verde-txt">★</span> : null}
            </p>
            {relacion.posicion ? (
              <p className="truncate text-xs text-tinta-3">{relacion.posicion}</p>
            ) : null}
          </div>
          {relacion.nivel ? (
            <span className="t-rotulo shrink-0 text-naranja-txt">{ROTULOS_NIVEL[relacion.nivel]}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
