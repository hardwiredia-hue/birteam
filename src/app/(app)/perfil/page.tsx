import { usuarioActual } from '@/lib/auth';
import { AccionesPerfil } from './acciones';

export const metadata = { title: 'Perfil' };
export const dynamic = 'force-dynamic';

export default async function Perfil() {
  const usuario = (await usuarioActual())!;
  const iniciales = usuario.nombre
    .split(' ')
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <span className="avatar h-[76px] w-[76px] text-xl">{iniciales}</span>
        <div>
          <h1 className="t-display text-[20px]">{usuario.nombre}</h1>
          <p className="t-rotulo mt-1">
            @{usuario.usuario}
            {usuario.ciudad ? ` · ${usuario.ciudad}` : ''}
          </p>
        </div>
      </header>

      {usuario.deportes.length > 0 ? (
        <section>
          <p className="t-rotulo mb-2">Deportes</p>
          <div className="flex flex-wrap gap-2">
            {usuario.deportes.map((relacion) => (
              <span
                key={relacion.deporteId}
                className={relacion.principal ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {relacion.deporte.nombre}
                {relacion.principal ? ' · principal' : ''}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <AccionesPerfil temaActual={usuario.tema} />
    </div>
  );
}
