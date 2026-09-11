export const metadata = { title: 'Crear partido' };

export default function Crear() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="t-pantalla">Nuevo partido</h1>
      <div className="tarjeta p-5">
        <p className="t-rotulo !text-verde-txt">En construcción</p>
        <p className="mt-2 text-sm text-tinta-2">
          El asistente de 6 pasos: deporte, cuándo (con partidos que se repiten), dónde, cupo y
          mínimo, costo, y a quién invitar.
        </p>
      </div>
    </div>
  );
}
