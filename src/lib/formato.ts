/** $2.500 — punto de miles, sin decimales (regla de diseno/). */
export function formatearPlata(monto: number, moneda = 'ARS') {
  const simbolo = moneda === 'ARS' ? '$' : `${moneda} `;
  return `${simbolo}${Math.round(monto).toLocaleString('es-AR')}`;
}
