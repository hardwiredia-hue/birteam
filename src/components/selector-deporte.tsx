'use client';

import { useState } from 'react';
import { agruparDeportes, type DeporteBasico } from '@/lib/deportes';
import { IconoDeporte } from '@/components/icono-deporte';

function Chip({
  activo,
  onClick,
  icono,
  children,
  deshabilitado,
}: {
  activo: boolean;
  onClick: () => void;
  icono?: string;
  children: React.ReactNode;
  deshabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-pressed={activo}
      className={`${activo ? 'chip-sel chip-sel-activo' : 'chip-sel'} inline-flex items-center gap-1.5`}
    >
      {icono ? <IconoDeporte icono={icono} /> : null}
      {children}
    </button>
  );
}

/**
 * Elegir UN deporte: primero la familia (con su ícono) y, si tiene varias
 * modalidades (Fútbol 5/7/11, Básquet 5x5/3x3), después el tipo.
 */
export function SelectorDeporte({
  deportes,
  valor,
  alCambiar,
  preguntaTipo = '¿Qué tipo?',
}: {
  deportes: DeporteBasico[];
  valor: string | null;
  alCambiar: (deporteId: string | null) => void;
  preguntaTipo?: string;
}) {
  const familias = agruparDeportes(deportes);
  const familiaDelValor = familias.find((f) => f.opciones.some((o) => o.id === valor))?.clave ?? null;
  const [abierta, setAbierta] = useState<string | null>(familiaDelValor);
  const familiaAbierta = familias.find((f) => f.clave === (abierta ?? familiaDelValor));

  function elegirFamilia(clave: string) {
    const familia = familias.find((f) => f.clave === clave)!;
    setAbierta(clave);
    if (familia.opciones.length === 1) alCambiar(familia.opciones[0].id);
    // Con varias modalidades, se elige recién en el segundo paso.
    else if (!familia.opciones.some((o) => o.id === valor)) alCambiar(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {familias.map((familia) => (
          <Chip
            key={familia.clave}
            activo={(abierta ?? familiaDelValor) === familia.clave}
            onClick={() => elegirFamilia(familia.clave)}
            icono={familia.icono}
          >
            {familia.nombre}
          </Chip>
        ))}
      </div>
      {familiaAbierta && familiaAbierta.opciones.length > 1 ? (
        <div className="flex flex-col gap-2">
          <span className="rotulo-campo">{preguntaTipo}</span>
          <div className="flex flex-wrap gap-2">
            {familiaAbierta.opciones.map((opcion) => (
              <Chip key={opcion.id} activo={valor === opcion.id} onClick={() => alCambiar(opcion.id)}>
                {opcion.modalidad}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Elegir VARIOS deportes (registro, perfil): la familia se toca para abrirla
 * y ahí se marcan sus modalidades; las de una sola modalidad se marcan directo.
 */
export function SelectorDeportes({
  deportes,
  elegidos,
  alCambiar,
  maximo,
}: {
  deportes: DeporteBasico[];
  elegidos: string[];
  alCambiar: (ids: string[]) => void;
  maximo?: number;
}) {
  const familias = agruparDeportes(deportes);
  const [abierta, setAbierta] = useState<string | null>(null);
  const lleno = maximo != null && elegidos.length >= maximo;

  function alternar(id: string) {
    if (elegidos.includes(id)) alCambiar(elegidos.filter((otro) => otro !== id));
    else if (!lleno) alCambiar([...elegidos, id]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {familias.map((familia) => {
          const marcadas = familia.opciones.filter((o) => elegidos.includes(o.id)).length;
          const unica = familia.opciones.length === 1;
          return (
            <Chip
              key={familia.clave}
              activo={marcadas > 0 || abierta === familia.clave}
              icono={familia.icono}
              deshabilitado={unica && marcadas === 0 && lleno}
              onClick={() =>
                unica ? alternar(familia.opciones[0].id) : setAbierta(abierta === familia.clave ? null : familia.clave)
              }
            >
              {familia.nombre}
              {!unica && marcadas > 0 ? ` · ${marcadas}` : ''}
            </Chip>
          );
        })}
      </div>
      {familias
        .filter((f) => f.clave === abierta && f.opciones.length > 1)
        .map((familia) => (
          <div key={familia.clave} className="flex flex-col gap-2">
            <span className="rotulo-campo">{familia.nombre}: ¿cuáles jugás?</span>
            <div className="flex flex-wrap gap-2">
              {familia.opciones.map((opcion) => (
                <Chip
                  key={opcion.id}
                  activo={elegidos.includes(opcion.id)}
                  deshabilitado={!elegidos.includes(opcion.id) && lleno}
                  onClick={() => alternar(opcion.id)}
                >
                  {opcion.modalidad}
                </Chip>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
