'use client';

import { useEffect, useRef } from 'react';
import type { Map as MapaLeaflet } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface PuntoMapa {
  id: string;
  latitud: number;
  longitud: number;
  titulo: string;
  subtitulo?: string;
  url: string;
  /** 'verde' (partidos) | 'naranja' (canchas) */
  color: 'verde' | 'naranja';
}

// Centro de la Argentina, para cuando no hay puntos ni ubicación del usuario.
const CENTRO_PAIS: [number, number] = [-38.4161, -63.6167];

function escapar(texto: string) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Mapa de Explorar: partidos o canchas sobre OpenStreetMap. Leaflet se carga
 * recién en el navegador (usa window) y el mapa se rearma si cambian los
 * puntos (otro deporte, otra búsqueda).
 */
export function Mapa({
  puntos,
  centro,
}: {
  puntos: PuntoMapa[];
  centro?: { latitud: number; longitud: number } | null;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaLeaflet | null>(null);
  const firma = JSON.stringify(puntos.map((p) => p.id));

  useEffect(() => {
    let vivo = true;
    (async () => {
      const L = (await import('leaflet')).default;
      if (!vivo || !caja.current) return;
      mapaRef.current?.remove();

      const mapa = L.map(caja.current, { scrollWheelZoom: true });
      mapaRef.current = mapa;

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'mapa-tiles',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      }).addTo(mapa);

      for (const punto of puntos) {
        const marcador = L.marker([punto.latitud, punto.longitud], {
          icon: L.divIcon({
            className: '',
            html: `<span class="mapa-pin mapa-pin-${punto.color}"></span>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        }).addTo(mapa);
        marcador.bindPopup(
          `<p class="mapa-popup-titulo">${escapar(punto.titulo)}</p>` +
            (punto.subtitulo ? `<p class="mapa-popup-sub">${escapar(punto.subtitulo)}</p>` : '') +
            `<a href="${escapar(punto.url)}">Ver →</a>`
        );
      }

      if (puntos.length > 0) {
        const limites = L.latLngBounds(puntos.map((p) => [p.latitud, p.longitud]));
        mapa.fitBounds(limites, { padding: [40, 40], maxZoom: 14 });
      } else if (centro) {
        mapa.setView([centro.latitud, centro.longitud], 12);
      } else {
        mapa.setView(CENTRO_PAIS, 4);
      }
    })();

    return () => {
      vivo = false;
      mapaRef.current?.remove();
      mapaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma]);

  return <div ref={caja} className="mapa-caja" aria-label="Mapa" />;
}
