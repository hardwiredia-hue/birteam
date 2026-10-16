import { resumenCancha } from '@/lib/servicios-cancha';

/** "Cómo es": techada, superficie y servicios, en etiquetas chicas. */
export function CaracteristicasCancha({
  cancha,
  conTitulo = true,
}: {
  cancha: { techada: boolean; superficie: string | null; servicios: string };
  conTitulo?: boolean;
}) {
  const partes = resumenCancha(cancha);
  if (partes.length === 0) return null;
  return (
    <section>
      {conTitulo ? <p className="t-rotulo">Cómo es</p> : null}
      <ul className={`flex flex-wrap gap-1.5 ${conTitulo ? 'mt-2' : ''}`}>
        {partes.map((parte) => (
          <li
            key={parte}
            className={`rounded-[6px] border px-2.5 py-1 text-[12.5px] font-semibold ${
              parte === 'Techada' ? 'border-verde-txt text-verde-txt' : 'border-borde text-tinta-2'
            }`}
          >
            {parte}
          </li>
        ))}
      </ul>
    </section>
  );
}
