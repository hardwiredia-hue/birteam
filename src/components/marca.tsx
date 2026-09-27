import Image from 'next/image';
import logoBlanco from '../../public/birteam-blanco.png';
import logoNegro from '../../public/birteam-negro.png';
import { obtenerMarca } from '@/lib/marca';

/**
 * Logotipo que respeta el tema: uno para fondo oscuro y otro para claro.
 * Usa los archivos del repo salvo que el backoffice (Marca) haya subido otros.
 */
export async function Logotipo({ ancho = 120 }: { ancho?: number }) {
  const marca = await obtenerMarca();

  return (
    <>
      {marca.personalizada.logo_oscuro ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={marca.logoOscuro}
          alt="birteam"
          style={{ width: ancho, height: 'auto' }}
          className="solo-oscuro"
        />
      ) : (
        <Image src={logoBlanco} alt="birteam" width={ancho} priority className="solo-oscuro" />
      )}
      {marca.personalizada.logo_claro ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={marca.logoClaro}
          alt="birteam"
          style={{ width: ancho, height: 'auto' }}
          className="solo-claro"
        />
      ) : (
        <Image src={logoNegro} alt="birteam" width={ancho} priority className="solo-claro" />
      )}
    </>
  );
}
