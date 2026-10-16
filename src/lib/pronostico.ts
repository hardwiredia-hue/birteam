/**
 * Pronóstico del tiempo para un partido, con Open-Meteo (gratis, sin clave).
 * Lo pide el navegador de cada uno (no el servidor): si no responde, no se
 * muestra nada y la página no espera.
 */

/** Más allá de esto el pronóstico por hora no sirve. */
export const DIAS_DE_PRONOSTICO = 7;

export interface DatosOpenMeteo {
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    precipitation_probability?: (number | null)[];
    weather_code?: (number | null)[];
    wind_speed_10m?: (number | null)[];
  };
}

export interface Pronostico {
  /** Temperatura al empezar, redondeada. */
  temperatura: number;
  /** La probabilidad de lluvia más alta mientras se juega (0 a 100). */
  lluvia: number;
  /** Viento máximo en km/h. */
  viento: number;
  /** "Despejado", "Nublado", "Lluvia", "Tormenta"… */
  cielo: string;
  /** Lluvia o tormenta probables: vale avisar. */
  mojado: boolean;
}

export function urlPronostico(latitud: number, longitud: number) {
  const parametros = new URLSearchParams({
    latitude: latitud.toFixed(3),
    longitude: longitud.toFixed(3),
    hourly: 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m',
    // Horas en UTC: se comparan directo con la fecha del partido.
    timezone: 'GMT',
    forecast_days: String(DIAS_DE_PRONOSTICO + 1),
  });
  return `https://api.open-meteo.com/v1/forecast?${parametros.toString()}`;
}

/** Códigos WMO → palabras. */
export function cieloDe(codigo: number) {
  if (codigo === 0) return 'Despejado';
  if (codigo <= 2) return 'Algo nublado';
  if (codigo === 3) return 'Nublado';
  if (codigo === 45 || codigo === 48) return 'Niebla';
  if (codigo >= 51 && codigo <= 57) return 'Llovizna';
  if ((codigo >= 61 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return 'Lluvia';
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return 'Nieve';
  if (codigo >= 95) return 'Tormenta';
  return 'Variable';
}

const esMojado = (codigo: number) => codigo >= 51 && codigo !== 71 && codigo !== 73 && codigo !== 75 && codigo !== 77;

/** "2026-10-17T23:00" (hora UTC del pronóstico) para un instante. */
function claveHora(instante: Date) {
  return instante.toISOString().slice(0, 13) + ':00';
}

/**
 * Resume las horas que dura el partido. Null si el pronóstico no llega a
 * esa fecha o falta algún dato.
 */
export function resumirPronostico(datos: DatosOpenMeteo, inicio: Date, minutos: number): Pronostico | null {
  const horas = datos.hourly;
  if (!horas?.time || !horas.temperature_2m) return null;
  const primera = horas.time.indexOf(claveHora(inicio));
  if (primera === -1) return null;
  const cuantas = Math.max(1, Math.ceil(minutos / 60));
  const indices = Array.from({ length: cuantas }, (_, i) => primera + i).filter((i) => i < horas.time!.length);

  const numeros = (lista: (number | null)[] | undefined) =>
    indices.map((i) => lista?.[i]).filter((valor): valor is number => typeof valor === 'number');
  const temperatura = horas.temperature_2m[primera];
  if (typeof temperatura !== 'number') return null;
  const lluvias = numeros(horas.precipitation_probability);
  const vientos = numeros(horas.wind_speed_10m);
  const codigos = numeros(horas.weather_code);
  // El peor cielo de esas horas (el código más alto es el más feo).
  const codigo = codigos.length > 0 ? Math.max(...codigos) : 0;
  const lluvia = lluvias.length > 0 ? Math.max(...lluvias) : 0;

  return {
    temperatura: Math.round(temperatura),
    lluvia: Math.round(lluvia),
    viento: Math.round(vientos.length > 0 ? Math.max(...vientos) : 0),
    cielo: cieloDe(codigo),
    mojado: lluvia >= 60 || (esMojado(codigo) && lluvia >= 30),
  };
}

/** Si vale pedir el pronóstico: el partido no terminó y es dentro de los próximos días. */
export function hayPronostico(inicio: Date, minutos: number, ahora = new Date()) {
  const fin = inicio.getTime() + minutos * 60_000;
  return fin > ahora.getTime() && inicio.getTime() - ahora.getTime() <= DIAS_DE_PRONOSTICO * 86400_000;
}
