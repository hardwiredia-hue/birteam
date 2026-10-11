'use client';

import { useState } from 'react';
import { FormularioCancha, type CanchaExistente } from '@/components/formulario-cancha';

type Props = Omit<React.ComponentProps<typeof FormularioCancha>, 'cancha' | 'plantilla'> & {
  /** Las canchas que ya tiene el complejo: se pueden usar de modelo. */
  modelos: CanchaExistente[];
};

/**
 * Publicar cancha con "Copiar datos de": arranca con la última cancha del
 * complejo (dirección, horarios, precios, cobro) y se cambia lo que difiera.
 */
export function NuevaConModelo({ modelos, ...props }: Props) {
  const [modeloId, setModeloId] = useState<string | null>(modelos[0]?.id ?? null);
  const modelo = modelos.find((m) => m.id === modeloId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {modelos.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="rotulo-campo">Copiar los datos de</span>
          <div className="flex flex-wrap gap-2">
            {modelos.map((m) => (
              <button
                key={m.id}
                type="button"
                className={m.id === modeloId ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                onClick={() => setModeloId(m.id)}
              >
                {m.nombre}
              </button>
            ))}
            <button
              type="button"
              className={modeloId === null ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              onClick={() => setModeloId(null)}
            >
              Empezar de cero
            </button>
          </div>
        </div>
      ) : null}
      {/* La key reinicia el formulario con los datos del modelo elegido. */}
      <FormularioCancha key={modeloId ?? 'cero'} plantilla={modelo} {...props} />
    </div>
  );
}
