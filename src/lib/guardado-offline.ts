import { COOKIE_UBICACION } from './ubicacion-comun';

/**
 * Borra lo que queda de una persona en el navegador (al salir, al entrar con
 * otra cuenta o al cerrar la cuenta): las pantallas guardadas para ver sin
 * señal y la ubicación del celular. En un celular compartido, lo de una
 * persona no le queda a la otra.
 */
export async function borrarGuardadoOffline() {
  document.cookie = `${COOKIE_UBICACION}=; path=/; max-age=0`;
  try {
    navigator.serviceWorker?.controller?.postMessage('borrar-guardado');
    if ('caches' in window) await caches.delete('birteam-paginas-v1');
  } catch {
    // Sin service worker o sin permiso: no había nada guardado.
  }
}
