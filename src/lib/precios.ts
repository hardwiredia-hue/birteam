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

/** Precio del turno: el de la hora, proporcional a la duración. */
export function precioDelTurno(precioPorHora: number | null, duracion: number) {
  return precioPorHora != null ? Math.round((precioPorHora * duracion) / 60) : null;
}

export interface PreciosCancha {
  precioPorHora: number | null;
  precioPico: number | null;
  picoDesdeHora: number | null;
  picoFinDeSemana: boolean;
  duracionTurno: number;
}

/** ¿El turno cae en horario pico (desde cierta hora, o sábado y domingo)? */
export function esHorarioPico(cancha: PreciosCancha, fecha: string, hora: string) {
  if (cancha.precioPico == null) return false;
  const horaDelTurno = Number(hora.slice(0, 2));
  if (cancha.picoDesdeHora != null && horaDelTurno >= cancha.picoDesdeHora) return true;
  // Día de la semana de la clave "2026-10-17" (sin depender de la zona horaria).
  const [anio, mes, dia0] = fecha.split('-').map(Number);
  const dia = new Date(Date.UTC(anio, mes - 1, dia0)).getUTCDay();
  return cancha.picoFinDeSemana && (dia === 0 || dia === 6);
}

/** Precio de un turno puntual, con el horario pico si corresponde. */
export function precioDelTurnoEn(cancha: PreciosCancha, fecha: string, hora: string) {
  const porHora = esHorarioPico(cancha, fecha, hora) ? cancha.precioPico : cancha.precioPorHora;
  return precioDelTurno(porHora, cancha.duracionTurno);
}
