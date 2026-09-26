import { usuarioActual } from '@/lib/auth';
import { FormularioEditar } from './formulario';

export const metadata = { title: 'Editar perfil' };
export const dynamic = 'force-dynamic';

export default async function EditarPerfil() {
  const usuario = (await usuarioActual())!;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="t-display text-[26px]">Editar perfil</h1>
      <FormularioEditar
        inicial={{
          nombre: usuario.nombre,
          bio: usuario.bio,
          telefono: usuario.telefono,
          ciudad: usuario.ciudad,
          provincia: usuario.provincia,
        }}
      />
    </div>
  );
}
