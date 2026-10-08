import { Logotipo } from '@/components/marca';

/** Pantalla de obra: el sitio está en construcción y pronto abre la cancha. */
export function PaginaConstruccion() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Logotipo ancho={132} />

      <div className="flex flex-1 flex-col justify-center py-10">
        <p className="t-rotulo text-verde-txt">Organizá · Jugá · Compartí</p>
        <h1 className="t-display mt-3 text-[40px]">
          Estamos
          <br />
          marcando
          <br />
          la cancha.
        </h1>
        <p className="mt-4 text-tinta-2">
          birteam está en construcción: la plataforma para organizar partidos, encontrar con quién
          jugar y alquilar canchas. Falta poco.
        </p>

        <div className="mt-8 flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--verde)' }} />
          <span className="t-rotulo">Muy pronto en tu ciudad</span>
        </div>
      </div>

      <p className="t-rotulo text-center">birteam.com</p>
    </main>
  );
}
