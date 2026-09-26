/** Avatar: la foto si hay, las iniciales si no. Redondo siempre. */
export function Avatar({
  nombre,
  avatarUrl,
  tam = 32,
  className = '',
}: {
  nombre: string;
  avatarUrl?: string | null;
  tam?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={avatarUrl}
        alt=""
        className={`avatar object-cover ${className}`}
        style={{ width: tam, height: tam }}
      />
    );
  }
  const iniciales = nombre
    .split(' ')
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.34) }}
    >
      {iniciales}
    </span>
  );
}
