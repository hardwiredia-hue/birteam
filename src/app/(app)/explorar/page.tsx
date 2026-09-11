export const metadata = { title: 'Explorar' };

export default function Explorar() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="t-pantalla">Explorar</h1>
      <div className="tarjeta p-5">
        <p className="t-rotulo !text-verde-txt">En construcción</p>
        <p className="mt-2 text-sm text-tinta-2">
          Acá vas a encontrar partidos, jugadores y grupos cerca tuyo, con filtros por deporte,
          distancia y fecha.
        </p>
      </div>
    </div>
  );
}
