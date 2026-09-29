/**
 * Tope de intentos en memoria (por proceso). Alcanza para frenar scripts
 * simples sin sumar dependencias; se resetea al reiniciar el servicio.
 */
const intentos = new Map<string, number[]>();

export function permitir(clave: string, maximo: number, ventanaMs: number) {
  const ahora = Date.now();
  const previos = (intentos.get(clave) ?? []).filter((momento) => ahora - momento < ventanaMs);
  if (previos.length >= maximo) {
    intentos.set(clave, previos);
    return false;
  }
  previos.push(ahora);
  intentos.set(clave, previos);
  // La tabla no crece sin límite: cada tanto se barren las claves viejas.
  if (intentos.size > 5000) {
    for (const [otraClave, momentos] of intentos) {
      if (momentos.every((momento) => ahora - momento >= ventanaMs)) intentos.delete(otraClave);
    }
  }
  return true;
}

/** IP real detrás del proxy del servidor. */
export function ipDelPedido(request: Request) {
  const reenviada = request.headers.get('x-forwarded-for');
  return reenviada?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'desconocida';
}
