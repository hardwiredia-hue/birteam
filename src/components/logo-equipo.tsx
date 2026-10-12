/** Logo de un grupo o equipo: la imagen si hay, las iniciales si no. Cuadrado redondeado. */
export function LogoEquipo({ nombre, url, tam = 40 }: { nombre: string; url?: string | null; tam?: number }) {
  const radio = Math.round(tam * 0.22);
  if (url) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={url}
        alt={`Logo de ${nombre}`}
        className="shrink-0 border border-borde bg-panel object-cover"
        style={{ width: tam, height: tam, borderRadius: radio }}
      />
    );
  }
  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center border border-borde-2 bg-fondo font-semibold text-tinta-2"
      style={{ width: tam, height: tam, borderRadius: radio, fontSize: Math.round(tam * 0.36) }}
    >
      {iniciales}
    </span>
  );
}
