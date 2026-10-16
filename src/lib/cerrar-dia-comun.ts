/** Lo de "Cerrar el día" que también usa el navegador (sin base de datos). */
export const MOTIVOS_CIERRE = ['Feriado', 'Mantenimiento', 'Evento privado', 'Lluvia'] as const;
export type MotivoCierre = (typeof MOTIVOS_CIERRE)[number];
