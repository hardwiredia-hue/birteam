/**
 * Actualizar precios de todo el complejo de una (aumentos, inflación): un
 * porcentaje y a qué redondear. Se aplica al precio por hora y al de pico.
 */

export const REDONDEOS = [0, 100, 500, 1000] as const;
export const PORCENTAJE_MINIMO = -50;
export const PORCENTAJE_MAXIMO = 200;

/** El precio nuevo, redondeado al múltiplo más cercano (nunca menos de 0). */
export function nuevoPrecio(precio: number, porcentaje: number, redondeo: number) {
  const crudo = precio * (1 + porcentaje / 100);
  const redondeado = redondeo > 0 ? Math.round(crudo / redondeo) * redondeo : Math.round(crudo);
  return Math.max(0, redondeado);
}
