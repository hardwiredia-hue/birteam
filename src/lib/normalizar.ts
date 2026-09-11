/** "Córdoba" → "cordoba": minúsculas y sin tildes, para buscar en cualquier base. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** "Fútbol 5" → "futbol-5" */
export function slugificar(texto: string): string {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
