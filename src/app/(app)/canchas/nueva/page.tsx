import Link from 'next/link';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { suscripcionActiva } from '@/lib/suscripcion';
import { comisionPorcentaje, duenoCobraOnline } from '@/lib/mercadopago';
import { FormularioCancha } from '@/components/formulario-cancha';

export const metadata = { title: 'Publicar cancha' };
export const dynamic = 'force-dynamic';

export default async function NuevaCancha() {
  const usuario = (await usuarioActual())!;

  if (usuario.tipoCuenta !== 'CANCHA') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="t-pantalla">Publicar cancha</h1>
        <div className="tarjeta p-5">
          <p className="t-rotulo text-naranja-txt">Cuenta de jugador</p>
          <p className="mt-2 text-sm text-tinta-2">
            Para publicar canchas necesitás una cuenta de dueño de cancha. Podés cambiar el tipo
            de cuenta desde tu perfil y después activar la suscripción.
          </p>
          <Link href="/perfil/editar" className="btn btn-secundario mt-4">
            Editar mi perfil
          </Link>
        </div>
      </div>
    );
  }

  if (!suscripcionActiva(usuario)) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="t-pantalla">Publicar cancha</h1>
        <div className="tarjeta p-5">
          <p className="t-rotulo text-naranja-txt">Suscripción pendiente</p>
          <p className="mt-2 text-sm text-tinta-2">
            Tu cuenta de dueño de cancha está creada, pero la suscripción todavía no está activa.
            Escribinos a <span className="font-semibold text-tinta">hola@birteam.com</span> desde
            el email de tu cuenta y la activamos.
          </p>
          <p className="mt-3 text-xs text-tinta-3">
            Con la suscripción activa publicás tus canchas con fotos, precio y contacto, y los
            equipos de tu zona las encuentran en Explorar.
          </p>
        </div>
      </div>
    );
  }

  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="t-pantalla">Publicar cancha</h1>
      <p className="text-sm text-tinta-2">
        Contá lo importante: dónde queda, cuánto sale y cómo te reservan.
      </p>
      <FormularioCancha
        deportes={deportes}
        predeterminados={{ direccion: usuario.complejoDireccion, telefono: usuario.telefono }}
        mercadoPago={{
          conectada: await duenoCobraOnline(usuario.id),
          comision: await comisionPorcentaje(),
        }}
      />
    </div>
  );
}
