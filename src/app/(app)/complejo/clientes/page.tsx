import Form from 'next/form';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { DIAS_CLIENTES, DIAS_SIN_VENIR, clientesDelComplejo, haceRatoQueNoViene } from '@/lib/clientes';
import { enlaceWhatsApp } from '@/lib/agenda';
import { formatearPlata, haceCuanto } from '@/lib/formato';
import { EnlaceAyuda } from '@/components/ayuda';

export const metadata = { title: 'Tus clientes' };
export const dynamic = 'force-dynamic';

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string; ver?: string }> }) {
  const { q, ver } = await searchParams;
  const usuario = (await usuarioActual())!;
  // Solo el dueño: incluye lo que gastó cada uno.
  if (usuario.tipoCuenta !== 'CANCHA') redirect('/perfil');
  const duenoId = usuario.id;

  const ahora = new Date();
  const todos = await clientesDelComplejo(duenoId, { q, ahora });
  const soloPerdidos = ver === 'perdidos';
  const perdidos = todos.filter((c) => haceRatoQueNoViene(c, ahora));
  const lista = soloPerdidos ? perdidos : todos;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <Link href="/complejo" className="text-[13px] font-semibold text-tinta-2">
          ← Mi complejo
        </Link>
        <h1 className="t-pantalla mt-1">Tus clientes</h1>
        <p className="mt-1 text-xs text-tinta-3">
          Los que reservaron en los últimos {DIAS_CLIENTES / 30} meses: cuánto vienen, cuándo fue la última vez y faltas.
        </p>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <EnlaceAyuda tema="complejos" articulo="clientes" />
          {todos.length > 0 ? (
            <a href="/api/complejo/clientes" className="text-[13px] font-semibold text-verde-txt" download>
              Descargar la lista (Excel)
            </a>
          ) : null}
        </div>
      </header>

      <Form action="/complejo/clientes" className="flex gap-2">
        {soloPerdidos ? <input type="hidden" name="ver" value="perdidos" /> : null}
        <input name="q" aria-label="Buscar cliente" className="campo" placeholder="Buscar por nombre o usuario…" defaultValue={q ?? ''} />
        <button type="submit" className="btn btn-secundario btn-sm">Buscar</button>
      </Form>

      <div className="flex flex-wrap gap-2">
        <Link href={`/complejo/clientes${q ? `?q=${encodeURIComponent(q)}` : ''}`} className={!soloPerdidos ? 'chip-sel chip-sel-activo' : 'chip-sel'}>
          Todos · {todos.length}
        </Link>
        <Link
          href={`/complejo/clientes?ver=perdidos${q ? `&q=${encodeURIComponent(q)}` : ''}`}
          className={soloPerdidos ? 'chip-sel chip-sel-activo' : 'chip-sel'}
        >
          Hace rato que no vienen · {perdidos.length}
        </Link>
      </div>
      {soloPerdidos ? (
        <p className="text-xs text-tinta-3">
          Vinieron al menos 2 veces, no vienen hace más de {DIAS_SIN_VENIR} días y no tienen turno. Un mensaje a tiempo los trae de vuelta.
        </p>
      ) : null}

      {lista.length === 0 ? (
        <p className="tarjeta p-5 text-sm text-tinta-2">
          {q
            ? 'Nadie con esa búsqueda.'
            : soloPerdidos
              ? 'Nadie: tus clientes siguen viniendo.'
              : 'Todavía no hay turnos confirmados. Cuando reserven, los vas a ver acá.'}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-borde border-y border-borde">
          {lista.map((cliente) => (
            <li key={cliente.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">
                  <Link href={`/jugadores/${cliente.usuario}`}>{cliente.nombre}</Link>
                  {cliente.fijo ? <span className="t-rotulo ml-2 align-middle text-verde-txt">Fijo</span> : null}
                </p>
                <p className="text-[13px] text-tinta-2 tabular">
                  {cliente.jugados} {cliente.jugados === 1 ? 'turno' : 'turnos'}
                  {cliente.gastado > 0 ? ` · ${formatearPlata(cliente.gastado)}` : ''}
                  {cliente.faltas > 0 ? (
                    <span className="text-naranja-txt">
                      {' '}
                      · {cliente.faltas} {cliente.faltas === 1 ? 'falta' : 'faltas'}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-tinta-3">
                  {cliente.proximos > 0
                    ? `${cliente.proximos === 1 ? 'Tiene un turno' : `Tiene ${cliente.proximos} turnos`} reservado${cliente.proximos === 1 ? '' : 's'}`
                    : cliente.ultimaVez
                      ? `Vino por última vez ${cuandoVino(cliente.ultimaVez, ahora)}`
                      : 'Todavía no jugó'}
                </p>
              </div>
              {cliente.telefono ? (
                <a
                  href={enlaceWhatsApp(cliente.telefono)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secundario btn-sm shrink-0"
                  aria-label={`WhatsApp de ${cliente.nombre}`}
                >
                  WhatsApp
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "hace 3 días", "ayer" o "el 3 oct". */
function cuandoVino(fecha: Date, ahora: Date) {
  const texto = haceCuanto(fecha, ahora);
  return /^(hace|ayer|recién)/.test(texto) ? texto : `el ${texto}`;
}
