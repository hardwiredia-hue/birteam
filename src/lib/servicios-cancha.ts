/**
 * Cómo es una cancha: superficie y servicios. Los carga el dueño con un
 * toque (chips) y el jugador los ve en la ficha y filtra por "techada".
 */

export const SUPERFICIES = [
  { valor: 'SINTETICO', rotulo: 'Césped sintético' },
  { valor: 'NATURAL', rotulo: 'Césped natural' },
  { valor: 'CEMENTO', rotulo: 'Cemento' },
  { valor: 'PARQUET', rotulo: 'Parquet' },
  { valor: 'POLVO_LADRILLO', rotulo: 'Polvo de ladrillo' },
  { valor: 'ARENA', rotulo: 'Arena' },
] as const;

export const SERVICIOS = [
  { valor: 'ILUMINACION', rotulo: 'Iluminación' },
  { valor: 'VESTUARIOS', rotulo: 'Vestuarios' },
  { valor: 'DUCHAS', rotulo: 'Duchas' },
  { valor: 'ESTACIONAMIENTO', rotulo: 'Estacionamiento' },
  { valor: 'BUFFET', rotulo: 'Buffet' },
  { valor: 'PARRILLA', rotulo: 'Parrilla' },
  { valor: 'WIFI', rotulo: 'Wi-Fi' },
  { valor: 'ALQUILER_EQUIPO', rotulo: 'Alquiler de pelotas y paletas' },
  { valor: 'ACCESIBLE', rotulo: 'Acceso para silla de ruedas' },
] as const;

export type Superficie = (typeof SUPERFICIES)[number]['valor'];
export type Servicio = (typeof SERVICIOS)[number]['valor'];

export const VALORES_SUPERFICIE = SUPERFICIES.map((s) => s.valor) as [Superficie, ...Superficie[]];
export const VALORES_SERVICIO = SERVICIOS.map((s) => s.valor) as [Servicio, ...Servicio[]];

/** El JSON guardado → servicios válidos, en el orden de la lista. */
export function leerServicios(texto: string | null | undefined): Servicio[] {
  let crudos: unknown = [];
  try {
    crudos = JSON.parse(texto ?? '[]');
  } catch {
    crudos = [];
  }
  if (!Array.isArray(crudos)) return [];
  return VALORES_SERVICIO.filter((valor) => crudos.includes(valor));
}

export function rotuloSuperficie(valor: string | null | undefined) {
  return SUPERFICIES.find((s) => s.valor === valor)?.rotulo ?? null;
}

export function rotuloServicio(valor: string) {
  return SERVICIOS.find((s) => s.valor === valor)?.rotulo ?? valor;
}

/** Lo que se muestra en una línea: "Techada · Césped sintético · Iluminación". */
export function resumenCancha(cancha: { techada: boolean; superficie: string | null; servicios: string }) {
  return [
    cancha.techada ? 'Techada' : null,
    rotuloSuperficie(cancha.superficie),
    ...leerServicios(cancha.servicios).map(rotuloServicio),
  ].filter((parte): parte is string => Boolean(parte));
}
