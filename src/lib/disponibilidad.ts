/**
 * Cuándo suele poder jugar cada uno: días de la semana y franjas del día.
 * Sirve para que los avisos de "faltan jugadores" lleguen a quien puede ir
 * y para buscar jugadores disponibles. Sin nada cargado, cuenta como que
 * puede siempre (nadie deja de recibir avisos por no completarlo).
 *
 * Sin dependencias de la base: lo usa también el navegador.
 */

export const FRANJAS = [
  { valor: 'manana', rotulo: 'Mañana', desde: 6, hasta: 12 },
  { valor: 'tarde', rotulo: 'Tarde', desde: 12, hasta: 18 },
  { valor: 'noche', rotulo: 'Noche', desde: 18, hasta: 30 },
] as const;
export type Franja = (typeof FRANJAS)[number]['valor'];

/** De lunes a domingo, con el número de Date.getDay(). */
export const DIAS_DISPONIBILIDAD = [
  { dia: 1, rotulo: 'Lun' },
  { dia: 2, rotulo: 'Mar' },
  { dia: 3, rotulo: 'Mié' },
  { dia: 4, rotulo: 'Jue' },
  { dia: 5, rotulo: 'Vie' },
  { dia: 6, rotulo: 'Sáb' },
  { dia: 0, rotulo: 'Dom' },
];

const ZONA = 'America/Argentina/Buenos_Aires';
const NUMERO_DIA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export const clave = (dia: number, franja: Franja) => `${dia}-${franja}`;

export function esClaveValida(texto: string) {
  const [dia, franja] = texto.split('-');
  return /^[0-6]$/.test(dia) && FRANJAS.some((f) => f.valor === franja);
}

export function leerDisponibilidad(texto: string | null | undefined): string[] {
  try {
    const crudo = JSON.parse(texto ?? '[]');
    return Array.isArray(crudo) ? crudo.filter((c): c is string => typeof c === 'string' && esClaveValida(c)) : [];
  } catch {
    return [];
  }
}

/**
 * Día y franja de un instante en hora argentina. De 0 a 6 de la mañana
 * cuenta como la noche del día anterior (el partido de las 00:30 es "noche").
 */
export function franjaDe(instante: Date): { dia: number; franja: Franja } {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(instante);
  const dia = NUMERO_DIA[partes.find((p) => p.type === 'weekday')?.value ?? 'Sun'] ?? 0;
  const hora = Number(partes.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  if (hora < 6) return { dia: (dia + 6) % 7, franja: 'noche' };
  const franja = FRANJAS.find((f) => hora >= f.desde && hora < f.hasta)?.valor ?? 'noche';
  return { dia, franja };
}

/** ¿Puede a esa hora? Sin disponibilidad cargada, sí. */
export function puedeJugar(disponibilidad: string | null | undefined, instante: Date) {
  const lista = leerDisponibilidad(disponibilidad);
  if (lista.length === 0) return true;
  const { dia, franja } = franjaDe(instante);
  return lista.includes(clave(dia, franja));
}

/** "Lun y Mié a la noche, Sáb a la tarde": resumen corto para el perfil. */
export function resumenDisponibilidad(disponibilidad: string | null | undefined) {
  const lista = leerDisponibilidad(disponibilidad);
  if (lista.length === 0) return null;
  const partes = FRANJAS.map((f) => {
    const dias = DIAS_DISPONIBILIDAD.filter((d) => lista.includes(clave(d.dia, f.valor))).map((d) => d.rotulo);
    if (dias.length === 0) return null;
    const cuando = f.valor === 'manana' ? 'a la mañana' : f.valor === 'tarde' ? 'a la tarde' : 'a la noche';
    const listaDias = dias.length === 7 ? 'Todos los días' : dias.length > 1 ? `${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}` : dias[0];
    return `${listaDias} ${cuando}`;
  }).filter(Boolean);
  return partes.join(' · ');
}
