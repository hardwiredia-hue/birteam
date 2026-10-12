/**
 * Borra las pantallas guardadas para ver sin señal (al salir, al entrar con
 * otra cuenta o al cerrar la cuenta): en un celular compartido, lo de una
 * persona no le queda a la otra.
 */
export async function borrarGuardadoOffline() {
  try {
    navigator.serviceWorker?.controller?.postMessage('borrar-guardado');
    if ('caches' in window) await caches.delete('birteam-paginas-v1');
  } catch {
    // Sin service worker o sin permiso: no había nada guardado.
  }
}
