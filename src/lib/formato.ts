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

const ZONA_AR = 'America/Argentina/Buenos_Aires';
const NUMERO_DIA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Día, mes y día de la semana de un instante en hora argentina. El servidor
 * corre en UTC: con getDay() un partido del viernes a las 22 salía "sábado".
 */
export function fechaArgentina(instante: Date) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_AR,
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  }).formatToParts(instante);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return {
    /** 0 = domingo … 6 = sábado. */
    diaSemana: NUMERO_DIA[valor('weekday')] ?? instante.getUTCDay(),
    dia: Number(valor('day')),
    /** 0 = enero … 11 = diciembre (como getMonth). */
    mes: Number(valor('month')) - 1,
  };
}

/** 0 = domingo … 6 = sábado, en hora argentina. */
export function diaDeLaSemana(instante: Date) {
  return fechaArgentina(instante).diaSemana;
}
