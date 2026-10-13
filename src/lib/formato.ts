/** $2.500 — punto de miles, sin decimales (regla de diseno/). */
export function formatearPlata(monto: number, moneda = 'ARS') {
  const simbolo = moneda === 'ARS' ? '$' : `${moneda} `;
  return `${simbolo}${Math.round(monto).toLocaleString('es-AR')}`;
}

/**
 * Cuánto hace, corto: "recién", "hace 5 min", "hace 2 h", "ayer", "hace 3
 * días" y, de una semana para atrás, la fecha ("4 oct").
 */
export function haceCuanto(fecha: Date, ahora: Date = new Date()) {
  const minutos = Math.floor((ahora.getTime() - fecha.getTime()) / 60_000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return fecha.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}
