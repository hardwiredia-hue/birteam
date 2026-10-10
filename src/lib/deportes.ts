/**
 * Familias de deportes para mostrarlos agrupados: "Fútbol" junta 5, 7 y 11;
 * "Básquet", 5x5 y 3x3; "Pádel", clásico y americano. En la base cada
 * modalidad sigue siendo un deporte (partidos, canchas y perfiles apuntan a
 * la modalidad); esto es solo cómo se eligen y se muestran.
 */

export interface DeporteBasico {
  id: string;
  nombre: string;
  slug: string;
}

interface InfoDeporte {
  /** Clave de la familia (va en las URLs de los filtros). */
  clave: string;
  familia: string;
  /** Cómo se llama la modalidad dentro de la familia (si hay varias). */
  modalidad?: string;
  /** Valor de la modalidad en los filtros, cuando su slug coincide con la clave de la familia. */
  filtro?: string;
  icono: string;
}

const CATALOGO: Record<string, InfoDeporte> = {
  'futbol-5': { clave: 'futbol', familia: 'Fútbol', modalidad: 'Fútbol 5', icono: 'futbol' },
  'futbol-7': { clave: 'futbol', familia: 'Fútbol', modalidad: 'Fútbol 7', icono: 'futbol' },
  'futbol-11': { clave: 'futbol', familia: 'Fútbol', modalidad: 'Fútbol 11', icono: 'futbol' },
  basquet: { clave: 'basquet', familia: 'Básquet', modalidad: '5x5', filtro: 'basquet-5x5', icono: 'basquet' },
  'basquet-3x3': { clave: 'basquet', familia: 'Básquet', modalidad: '3x3', icono: 'basquet' },
  padel: { clave: 'padel', familia: 'Pádel', modalidad: 'Clásico', filtro: 'padel-clasico', icono: 'padel' },
  'padel-americano': { clave: 'padel', familia: 'Pádel', modalidad: 'Americano', icono: 'padel' },
  voley: { clave: 'voley', familia: 'Vóley', icono: 'voley' },
  rugby: { clave: 'rugby', familia: 'Rugby', icono: 'rugby' },
  tenis: { clave: 'tenis', familia: 'Tenis', icono: 'tenis' },
  hockey: { clave: 'hockey', familia: 'Hockey', icono: 'hockey' },
  handball: { clave: 'handball', familia: 'Handball', icono: 'handball' },
  running: { clave: 'running', familia: 'Running', icono: 'running' },
  ciclismo: { clave: 'ciclismo', familia: 'Ciclismo', icono: 'ciclismo' },
  motociclismo: { clave: 'motociclismo', familia: 'Motociclismo', icono: 'motociclismo' },
  natacion: { clave: 'natacion', familia: 'Natación', icono: 'natacion' },
  skate: { clave: 'skate', familia: 'Skate', icono: 'skate' },
};

/** Familia, modalidad e ícono de un deporte (los que se agreguen después van solos). */
export function infoDeporte(deporte: { nombre: string; slug: string }): InfoDeporte {
  return CATALOGO[deporte.slug] ?? { clave: deporte.slug, familia: deporte.nombre, icono: 'generico' };
}

export interface FamiliaDeporte {
  clave: string;
  nombre: string;
  icono: string;
  opciones: (DeporteBasico & { modalidad: string; filtro: string })[];
}

/** Agrupa los deportes en familias, respetando el orden en que vienen. */
export function agruparDeportes<T extends DeporteBasico>(deportes: T[]): FamiliaDeporte[] {
  const familias: FamiliaDeporte[] = [];
  for (const deporte of deportes) {
    const info = infoDeporte(deporte);
    let familia = familias.find((f) => f.clave === info.clave);
    if (!familia) {
      familia = { clave: info.clave, nombre: info.familia, icono: info.icono, opciones: [] };
      familias.push(familia);
    }
    familia.opciones.push({
      id: deporte.id,
      nombre: deporte.nombre,
      slug: deporte.slug,
      modalidad: info.modalidad ?? deporte.nombre,
      filtro: info.filtro ?? deporte.slug,
    });
  }
  return familias;
}

/**
 * Para filtros por URL (?deporte=…): acepta la clave de una familia
 * ("futbol" → todas sus modalidades) o el valor de una modalidad
 * ("futbol-7", "basquet-3x3", "basquet-5x5").
 */
export function slugsDelFiltro(valor: string | undefined | null, deportes: DeporteBasico[]) {
  if (!valor) return null;
  const familias = agruparDeportes(deportes);
  const familia = familias.find((f) => f.clave === valor);
  if (familia) return familia.opciones.map((o) => o.slug);
  const opcion = familias.flatMap((f) => f.opciones).find((o) => o.filtro === valor);
  return [opcion ? opcion.slug : valor];
}

/** Familia y modalidad marcadas por un filtro activo (para pintar los chips). */
export function seleccionDelFiltro(valor: string | undefined | null, deportes: DeporteBasico[]) {
  if (!valor) return { familia: null, modalidad: null };
  const familias = agruparDeportes(deportes);
  if (familias.some((f) => f.clave === valor)) return { familia: valor, modalidad: null };
  for (const familia of familias) {
    const opcion = familia.opciones.find((o) => o.filtro === valor || o.slug === valor);
    if (opcion) return { familia: familia.clave, modalidad: opcion.filtro };
  }
  return { familia: valor, modalidad: null };
}

/** Clave de familia para un filtro activo (para marcar el chip correcto). */
export function familiaDelFiltro(valor: string | undefined | null, deportes: DeporteBasico[]) {
  return seleccionDelFiltro(valor, deportes).familia;
}

/** Nombre legible del filtro activo ("Fútbol", "Fútbol 7", "Básquet 3x3"). */
export function nombreDelFiltro(valor: string | undefined | null, deportes: DeporteBasico[]) {
  const { familia, modalidad } = seleccionDelFiltro(valor, deportes);
  const encontrada = agruparDeportes(deportes).find((f) => f.clave === familia);
  if (!encontrada) return null;
  const opcion = encontrada.opciones.find((o) => o.filtro === modalidad);
  return opcion ? opcion.nombre : encontrada.nombre;
}
