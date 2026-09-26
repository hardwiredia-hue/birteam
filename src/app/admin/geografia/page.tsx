import Form from 'next/form';
import { prisma } from '@/lib/db';
import { normalizar } from '@/lib/normalizar';
import { AltaCiudad, BorrarCiudad } from './acciones';

export const metadata = { title: 'Geografía' };
export const dynamic = 'force-dynamic';

export default async function Geografia({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const filtro = q ? normalizar(q) : null;

  const [paises, provincias, ciudades, resultados] = await Promise.all([
    prisma.pais.count(),
    prisma.provincia.count(),
    prisma.ciudad.count(),
    filtro
      ? prisma.ciudad.findMany({
          where: { nombreNorm: { contains: filtro } },
          include: { provincia: true },
          orderBy: { nombreNorm: 'asc' },
          take: 20,
        })
      : Promise.resolve([]),
  ]);
  const listaProvincias = await prisma.provincia.findMany({
    where: { paisCodigo: 'AR' },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true },
  });

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-3 gap-2">
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[22px] tabular">{paises}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Países</p>
        </div>
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[22px] tabular">{provincias}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Provincias</p>
        </div>
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[22px] tabular">{ciudades}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Ciudades</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Form action="/admin/geografia" className="flex gap-2">
          <input
            id="buscar-ciudad"
            name="q"
            className="campo"
            placeholder="Buscar ciudad…"
            defaultValue={q ?? ''}
          />
          <button type="submit" className="btn btn-secundario btn-sm">Buscar</button>
        </Form>

        {filtro ? (
          resultados.length === 0 ? (
            <p className="tarjeta p-4 text-sm text-tinta-2">
              No está en el catálogo. Cargala acá abajo y queda disponible para todos.
            </p>
          ) : (
            <div>
              {resultados.map((ciudad) => (
                <div key={ciudad.id} className="flex items-center gap-3 border-b border-borde py-2 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{ciudad.nombre}</p>
                    <p className="text-xs text-tinta-3">
                      {ciudad.provincia.nombre}
                      {ciudad.latitud != null ? ` · ${ciudad.latitud.toFixed(3)}, ${ciudad.longitud?.toFixed(3)}` : ''}
                    </p>
                  </div>
                  <BorrarCiudad ciudadId={ciudad.id} nombre={ciudad.nombre} />
                </div>
              ))}
            </div>
          )
        ) : null}
      </section>

      <section>
        <p className="t-rotulo mb-2">Cargar ciudad a mano</p>
        <AltaCiudad provincias={listaProvincias} />
      </section>
    </div>
  );
}
