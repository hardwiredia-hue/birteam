import { usuarioActual } from '@/lib/auth';
import { obtenerFeed } from '@/lib/jugadas';
import { PublicarJugada, TarjetaJugada } from '@/components/jugadas';

export const metadata = { title: 'Jugadas' };
export const dynamic = 'force-dynamic';

export default async function Jugadas() {
  const usuario = (await usuarioActual())!;
  const { red, comunidad } = await obtenerFeed(usuario.id);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="t-pantalla">Jugadas</h1>

      <PublicarJugada invitacion="Subí una jugada" />

      {red.length === 0 && comunidad.length === 0 ? (
        <div className="tarjeta p-5">
          <p className="text-sm text-tinta-2">
            Acá van a aparecer las jugadas de tu gente: los que seguís, tus grupos y tus partidos.
            Arrancá subiendo la primera, o seguí jugadores desde sus perfiles.
          </p>
        </div>
      ) : (
        <>
          {red.length > 0 ? (
            <section className="flex flex-col gap-3">
              <p className="t-rotulo">De tu red</p>
              {red.map((jugada) => (
                <TarjetaJugada key={jugada.id} jugada={jugada} />
              ))}
            </section>
          ) : null}

          {comunidad.length > 0 ? (
            <section className="flex flex-col gap-3">
              <p className="t-rotulo">De la comunidad</p>
              {comunidad.map((jugada) => (
                <TarjetaJugada key={jugada.id} jugada={jugada} />
              ))}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
