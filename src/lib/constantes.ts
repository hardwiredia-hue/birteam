// Valores válidos de los campos "enum" del modelo (SQLite no soporta enums;
// ver prisma/schema.prisma). Cualquier valor nuevo se agrega acá primero.

export const ESTADOS_PARTICIPACION = ['VOY', 'TALVEZ', 'NOVOY', 'ESPERA', 'INVITADO'] as const;
export type EstadoParticipacion = (typeof ESTADOS_PARTICIPACION)[number];

export const ESTADOS_PARTIDO = ['ARMANDOSE', 'CONFIRMADO', 'JUGADO', 'CANCELADO'] as const;
export type EstadoPartido = (typeof ESTADOS_PARTIDO)[number];

export const VISIBILIDADES_PARTIDO = ['GRUPO', 'ABIERTO'] as const;

export const ROLES_USUARIO = ['USUARIO', 'ADMIN'] as const;
export const ROLES_GRUPO = ['ADMIN', 'MIEMBRO'] as const;

export const TEMAS = ['oscuro', 'claro'] as const;

/** Horas que tiene el 1º de la lista de espera para confirmar un lugar liberado. */
export const HORAS_VENCIMIENTO_ESPERA = 2;

/** Cuántos deportes puede elegir un usuario en su perfil. */
export const MAX_DEPORTES_USUARIO = 5;

/** Catálogo inicial de deportes (se siembra en la base). */
export const DEPORTES_INICIALES = [
  'Fútbol 5',
  'Fútbol 11',
  'Básquet',
  'Vóley',
  'Rugby',
  'Tenis',
  'Pádel',
  'Hockey',
  'Handball',
  'Running',
  'Ciclismo',
  'Motociclismo',
  'Natación',
  'Skate',
] as const;

/** Radio de búsqueda por defecto y opciones sugeridas (km). */
export const RADIOS_KM = [5, 10, 15, 25, 50] as const;
