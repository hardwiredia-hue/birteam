import { obtenerMarca } from '@/lib/marca';
import { ImagenDeMarca } from './acciones';

export const metadata = { title: 'Marca' };
export const dynamic = 'force-dynamic';

export default async function Marca() {
  const marca = await obtenerMarca();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-tinta-2">
        Logo, ícono y favicon del sitio. Lo que subas acá reemplaza a los archivos de fábrica en
        toda la app al instante; con &quot;Restaurar&quot; se vuelve al original. En los teléfonos
        que ya instalaron la app, el ícono nuevo aparece al reinstalarla.
      </p>

      <ImagenDeMarca
        tipo="logo_oscuro"
        titulo="Logo para fondo oscuro"
        ayuda="PNG con fondo transparente, apaisado. Es el que se ve casi siempre: la app arranca en oscuro."
        url={marca.logoOscuro}
        personalizada={Boolean(marca.personalizada.logo_oscuro)}
        fondo="#0a0b08"
      />
      <ImagenDeMarca
        tipo="logo_claro"
        titulo="Logo para fondo claro"
        ayuda="La versión oscura del logo, para el tema claro."
        url={marca.logoClaro}
        personalizada={Boolean(marca.personalizada.logo_claro)}
        fondo="#f4f6ea"
      />
      <ImagenDeMarca
        tipo="icono"
        titulo="Ícono de la app"
        ayuda="PNG cuadrado de al menos 512×512, con margen: se usa en la pantalla del teléfono (PWA) y en el aviso push. Los bordes los redondea cada sistema."
        url={marca.icono512}
        personalizada={Boolean(marca.personalizada.icono)}
        fondo="#12140d"
        cuadrada
      />
      <ImagenDeMarca
        tipo="favicon"
        titulo="Favicon"
        ayuda="PNG cuadrado chico (64×64 alcanza): la pestaña del navegador."
        url={marca.favicon}
        personalizada={Boolean(marca.personalizada.favicon)}
        fondo="#12140d"
        cuadrada
      />
    </div>
  );
}
