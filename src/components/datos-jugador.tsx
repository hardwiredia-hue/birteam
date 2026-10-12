/** Las cifras del jugador en su perfil: asistencia, jugados, figura y grupos. */
export function DatosJugador({
  asistencia,
  jugados,
  figura,
  grupos,
}: {
  asistencia: number | null;
  jugados: number;
  figura: number;
  grupos: number;
}) {
  const datos = [
    { valor: asistencia === null ? '—' : `${asistencia}%`, rotulo: 'Asistencia', destacado: true },
    { valor: String(jugados), rotulo: 'Jugados' },
    { valor: String(figura), rotulo: 'Figura', destacado: figura > 0 },
    { valor: String(grupos), rotulo: 'Grupos' },
  ];
  return (
    <section className="grid grid-cols-4 gap-2">
      {datos.map((dato) => (
        <div key={dato.rotulo} className="tarjeta px-1.5 py-3 text-center">
          <p className={`t-display text-[22px] tabular ${dato.destacado ? 'text-verde-txt' : ''}`}>{dato.valor}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">{dato.rotulo}</p>
        </div>
      ))}
    </section>
  );
}
