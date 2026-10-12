/** Mientras carga una pantalla: el esqueleto de un título y algunas tarjetas. */
export default function Cargando() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando">
      <div className="esqueleto h-7 w-44" />
      <div className="esqueleto h-4 w-64" />
      <div className="mt-2 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="tarjeta flex flex-col gap-3 p-4">
            <div className="esqueleto h-3 w-20" />
            <div className="esqueleto h-6 w-48" />
            <div className="esqueleto h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
