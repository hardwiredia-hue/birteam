'use client';

import { useEffect, useState } from 'react';

/**
 * "Tus partidos en tu calendario": un link que Google Calendar o el iPhone
 * vuelven a leer solos, así lo nuevo aparece sin tocar nada.
 */
export function CalendarioSincronizado({ rutaInicial }: { rutaInicial: string | null }) {
  const [ruta, setRuta] = useState(rutaInicial);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El dominio se lee en el navegador (en el servidor no hay "location").
  const [origen, setOrigen] = useState('');
  useEffect(() => setOrigen(location.origin), []);
  const https = ruta && origen ? `${origen}${ruta}` : null;
  const webcal = https ? https.replace(/^https?:/, 'webcal:') : null;

  async function pedir(metodo: 'POST' | 'DELETE') {
    if (metodo === 'POST' && ruta && !confirm('El link anterior deja de andar. ¿Lo cambiamos?')) return;
    setOcupado(true);
    setError(null);
    const respuesta = await fetch('/api/perfil/calendario', { method: metodo });
    const datos = await respuesta.json().catch(() => ({}));
    setOcupado(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos hacerlo. Probá de nuevo.');
      return;
    }
    setRuta(metodo === 'POST' ? datos.ruta : null);
    setCopiado(false);
  }

  async function copiar() {
    if (!https) return;
    try {
      await navigator.clipboard.writeText(https);
      setCopiado(true);
    } catch {
      setError('No pudimos copiarlo: mantené apretado el link y copialo a mano.');
    }
  }

  return (
    <div className="tarjeta flex flex-col gap-3 p-4">
      <div>
        <p className="text-sm font-semibold">Tus partidos en tu calendario</p>
        <p className="text-xs text-tinta-3">
          Suma tus partidos y turnos a Google Calendar o al calendario del celular, y se actualiza solo
          cuando te anotás en otro.
        </p>
      </div>
      {ruta && !https ? null : https && webcal ? (
        <>
          <div className="flex flex-wrap gap-2">
            <a href={webcal} className="btn btn-secundario btn-sm">
              iPhone o Outlook
            </a>
            <a
              href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secundario btn-sm"
            >
              Google Calendar
            </a>
            <button type="button" className="btn btn-fantasma btn-sm" onClick={copiar}>
              {copiado ? 'Copiado' : 'Copiar el link'}
            </button>
          </div>
          <p className="text-xs text-tinta-3">
            El link es tuyo: quien lo tenga ve tus partidos.{' '}
            <button type="button" className="font-semibold text-tinta-2 underline" onClick={() => pedir('POST')} disabled={ocupado}>
              Cambiarlo
            </button>{' '}
            o{' '}
            <button type="button" className="font-semibold text-tinta-2 underline" onClick={() => pedir('DELETE')} disabled={ocupado}>
              apagarlo
            </button>
            .
          </p>
        </>
      ) : (
        <button type="button" className="btn btn-secundario btn-sm self-start" onClick={() => pedir('POST')} disabled={ocupado}>
          {ocupado ? 'Creando…' : 'Sincronizar mi calendario'}
        </button>
      )}
      {error ? <p className="aviso-error">{error}</p> : null}
    </div>
  );
}
