/** Una celda CSV segura (comillas, y sin fórmulas que una planilla pueda ejecutar). */
export function celda(valor: string | number | null | undefined) {
  if (valor == null) return '';
  let texto = String(valor);
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return /[";\n,]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Planilla para descargar: BOM para que Excel abra bien los acentos; ";" como usa Excel en es-AR. */
export function respuestaCsv(filas: (string | number | null | undefined)[][], nombreArchivo: string) {
  const contenido = '﻿' + filas.map((fila) => fila.map(celda).join(';')).join('\r\n');
  return new Response(contenido, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
