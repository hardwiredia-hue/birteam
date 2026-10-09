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

/** Motivos de denuncia, con su rótulo visible. */
export const MOTIVOS_DENUNCIA = [
  { valor: 'ACOSO', rotulo: 'Acoso o maltrato' },
  { valor: 'VIOLENCIA', rotulo: 'Violencia o amenazas' },
  { valor: 'SPAM', rotulo: 'Spam o venta' },
  { valor: 'PERFIL_FALSO', rotulo: 'Perfil falso' },
  { valor: 'OTRO', rotulo: 'Otro motivo' },
] as const;

/** Radio de búsqueda por defecto y opciones sugeridas (km). */
export const RADIOS_KM = [5, 10, 15, 25, 50] as const;

/** Tipos de cuenta: jugador (por defecto) o dueño de cancha para alquilar. */
export const TIPOS_CUENTA = ['JUGADOR', 'CANCHA'] as const;

/** Niveles de juego (autodeclarados en el perfil, sugeridos en los partidos). */
export const NIVELES = ['INICIAL', 'INTERMEDIO', 'AVANZADO', 'COMPETITIVO'] as const;
export type Nivel = (typeof NIVELES)[number];
export const ROTULOS_NIVEL: Record<string, string> = {
  INICIAL: 'Inicial',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
  COMPETITIVO: 'Competitivo',
};

/** Posiciones sugeridas por deporte (se puede escribir otra). */
export const POSICIONES_POR_DEPORTE: Record<string, string[]> = {
  'Fútbol 5': ['Arquero', 'Defensor', 'Mediocampista', 'Delantero', 'Comodín'],
  'Fútbol 11': ['Arquero', 'Central', 'Lateral', 'Volante', 'Enganche', 'Delantero'],
  Básquet: ['Base', 'Escolta', 'Alero', 'Ala-pívot', 'Pívot'],
  Vóley: ['Armador', 'Opuesto', 'Central', 'Punta', 'Líbero'],
  Rugby: ['Pilar', 'Hooker', 'Segunda línea', 'Ala', 'Octavo', 'Medio scrum', 'Apertura', 'Centro', 'Wing', 'Fullback'],
  Tenis: ['Singles', 'Dobles'],
  Pádel: ['Drive', 'Revés'],
  Hockey: ['Arco', 'Defensa', 'Volante', 'Delantera'],
  Handball: ['Arquero', 'Central', 'Lateral', 'Extremo', 'Pivote'],
};
