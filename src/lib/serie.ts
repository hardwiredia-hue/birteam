/**
 * Nombres en serie para canchas iguales de un mismo complejo:
 * "Cancha 3" → "Cancha 4"; "F5" → "F6"; "La Redonda" → "La Redonda 2".
 */

function partes(nombre: string) {
  const limpio = nombre.trim();
  const coincidencia = limpio.match(/^(.*?)(\s*)(\d+)$/);
  // Sin número al final: se agrega separado por un espacio.
  if (!coincidencia || !coincidencia[1]) return { raiz: limpio, separador: ' ', numero: null as number | null };
  return { raiz: coincidencia[1], separador: coincidencia[2], numero: Number(coincidencia[3]) };
}

/** El nombre que sigue al de una cancha existente. */
export function siguienteNombre(nombre: string) {
  const { raiz, separador, numero } = partes(nombre);
  return `${raiz}${separador}${numero == null ? 2 : numero + 1}`;
}

/** Los nombres de `cantidad` canchas a partir del escrito (si termina en número, sigue desde ahí). */
export function nombresEnSerie(nombre: string, cantidad: number) {
  if (cantidad <= 1) return [nombre.trim()];
  const { raiz, separador, numero } = partes(nombre);
  const desde = numero ?? 1;
  return Array.from({ length: cantidad }, (_, indice) => `${raiz}${separador}${desde + indice}`);
}
