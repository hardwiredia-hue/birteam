import Image from 'next/image';
import logoBlanco from '../../public/birteam-blanco.png';
import logoNegro from '../../public/birteam-negro.png';

/** Logotipo que respeta el tema: blanco en oscuro, negro en claro. */
export function Logotipo({ ancho = 120 }: { ancho?: number }) {
  return (
    <>
      <Image src={logoBlanco} alt="birteam" width={ancho} priority className="solo-oscuro" />
      <Image src={logoNegro} alt="birteam" width={ancho} priority className="solo-claro" />
    </>
  );
}
