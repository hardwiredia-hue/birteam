'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ActivarPush } from '@/components/activar-push';

function Interruptor({ prendido, alCambiar, rotulo }: { prendido: boolean; alCambiar: () => void; rotulo: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={prendido}
      aria-label={rotulo}
      onClick={alCambiar}
      className="relative h-[22px] w-10 shrink-0 rounded-[6px] border-0 transition-colors"
      style={{ background: prendido ? 'var(--verde)' : 'var(--borde-2)' }}
    >
      <span
        className="absolute top-[2px] h-[18px] w-[18px] rounded-[4px] transition-all"
        style={{
          left: prendido ? 20 : 2,
          background: prendido ? 'var(--sobre-verde)' : 'var(--tinta-2)',
        }}
      />
    </button>
  );
}

const AVISOS = [
  { clave: 'avisosSociales', titulo: 'Avisos sociales', detalle: 'Me gusta, comentarios y seguidores nuevos.' },
  { clave: 'avisosRadar', titulo: 'Radar de turnos libres', detalle: 'Descuentos de canchas de tu deporte en tu ciudad (máximo uno cada 12 h).' },
  { clave: 'avisosDesafios', titulo: 'Desafíos', detalle: 'Cuando desafían a tu grupo o responden un desafío tuyo.' },
] as const;

export type PreferenciasAvisos = Record<(typeof AVISOS)[number]['clave'], boolean>;

export function AccionesPerfil({
  temaActual,
  avisos: avisosIniciales,
}: {
  temaActual: string;
  avisos: PreferenciasAvisos;
}) {
  const [avisos, setAvisos] = useState(avisosIniciales);

  async function cambiarAviso(clave: keyof PreferenciasAvisos) {
    const valor = !avisos[clave];
    setAvisos((previos) => ({ ...previos, [clave]: valor }));
    const respuesta = await fetch('/api/perfil/avisos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave, valor }),
    });
    if (!respuesta.ok) setAvisos((previos) => ({ ...previos, [clave]: !valor }));
  }

  const router = useRouter();
  const [tema, setTema] = useState(temaActual);
  const [saliendo, setSaliendo] = useState(false);

  async function cambiarTema() {
    const nuevo = tema === 'claro' ? 'oscuro' : 'claro';
    setTema(nuevo);
    document.documentElement.dataset.theme = nuevo === 'claro' ? 'light' : '';
    if (nuevo === 'oscuro') delete document.documentElement.dataset.theme;
    await fetch('/api/tema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema: nuevo }),
    });
    router.refresh();
  }

  async function salir() {
    setSaliendo(true);
    await fetch('/api/auth/salir', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="t-rotulo">Ajustes</p>

      <div className="tarjeta flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-semibold">Tema claro</p>
          <p className="text-xs text-tinta-3">La app arranca en oscuro; esto lo cambia para vos.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={tema === 'claro'}
          onClick={cambiarTema}
          className="relative h-[22px] w-10 rounded-[6px] border-0 transition-colors"
          style={{ background: tema === 'claro' ? 'var(--verde)' : 'var(--borde-2)' }}
        >
          <span
            className="absolute top-[2px] h-[18px] w-[18px] rounded-[4px] transition-all"
            style={{
              left: tema === 'claro' ? 20 : 2,
              background: tema === 'claro' ? 'var(--sobre-verde)' : 'var(--tinta-2)',
            }}
          />
        </button>
      </div>

      <ActivarPush />

      <div className="tarjeta flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-semibold">Qué avisos querés</p>
          <p className="text-xs text-tinta-3">
            Los de tus partidos y reservas llegan siempre. Estos los elegís vos.
          </p>
        </div>
        {AVISOS.map((aviso) => (
          <div key={aviso.clave} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm">{aviso.titulo}</p>
              <p className="text-xs text-tinta-3">{aviso.detalle}</p>
            </div>
            <Interruptor
              prendido={avisos[aviso.clave]}
              rotulo={aviso.titulo}
              alCambiar={() => cambiarAviso(aviso.clave)}
            />
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-peligro" onClick={salir} disabled={saliendo}>
        {saliendo ? 'Cerrando…' : 'Cerrar sesión'}
      </button>
    </section>
  );
}

/** Subir (o volver a subir) el comprobante de titularidad del dueño de cancha. */
export function SubirComprobante({ nombreUsuario }: { nombreUsuario: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegir(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setOcupado(true);
    setError(null);
    const form = new FormData();
    form.append('archivo', archivo);
    const subida = await fetch('/api/archivos', { method: 'POST', body: form });
    const datos = await subida.json().catch(() => ({}));
    if (!subida.ok) {
      setError(datos.error ?? 'No pudimos subir el comprobante.');
      setOcupado(false);
      return;
    }
    const respuesta = await fetch('/api/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombreUsuario, verificacionDoc: datos.nombre }),
    });
    setOcupado(false);
    if (!respuesta.ok) {
      setError('No pudimos guardar el comprobante. Probá de nuevo.');
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <label className="btn btn-secundario btn-sm cursor-pointer">
        {ocupado ? 'Subiendo…' : 'Subir comprobante'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={elegir}
          disabled={ocupado}
        />
      </label>
      {error ? <p className="aviso-error mt-2">{error}</p> : null}
    </div>
  );
}
