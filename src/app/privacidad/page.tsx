import Link from 'next/link';
import { Logotipo } from '@/components/marca';

export const metadata = { title: 'Política de privacidad' };

export default function Privacidad() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link href="/">
        <Logotipo ancho={100} />
      </Link>
      <h1 className="t-display mt-8 text-[28px]">Política de privacidad</h1>
      <p className="t-rotulo mt-2">Última actualización: septiembre de 2026</p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-tinta-2">
        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">1. Qué datos guardamos</h2>
          <p>
            Los que cargás vos: nombre, usuario, email, contraseña (guardada cifrada: ni nosotros
            podemos leerla), teléfono y bio si los completás, tu ciudad y — solo si la activás — tu
            ubicación aproximada, tus deportes, tus fotos y publicaciones, y la actividad propia de
            la app (partidos, grupos, mensajes, asistencia).
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">2. Para qué los usamos</h2>
          <p>
            Para que birteam funcione: mostrarte partidos y jugadores cerca tuyo, que te encuentren
            para jugar, avisarte lo que te afecta (un lugar liberado, un partido que cambió) y
            calcular tus estadísticas. Nada más.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">3. Qué NO hacemos</h2>
          <p>
            No vendemos tus datos. No se los damos a anunciantes. No mandamos tu email ni tu
            teléfono a otros usuarios: el contacto dentro de la app es por mensajes. Tu ubicación
            exacta nunca se muestra a nadie; solo se usa para calcular distancias.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">4. Qué ven los demás</h2>
          <p>
            Tu perfil público: nombre, usuario, foto, ciudad, deportes, estadísticas de juego y tus
            publicaciones. Los links públicos de partidos y torneos muestran lo necesario para
            sumarse (deporte, horario, lugar, cupos), no tus datos de contacto.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">5. Tus derechos</h2>
          <p>
            Podés acceder, corregir o pedir la eliminación de tus datos cuando quieras (Ley 25.326
            de Protección de Datos Personales). Tus datos los corregís desde tu perfil, y podés
            cerrar la cuenta vos mismo en Perfil › Ajustes › Eliminar mi cuenta: se borran tus
            datos personales y tu contenido al instante. Para cualquier otro pedido escribinos a{' '}
            <span className="text-tinta">hola@birteam.com</span> y lo resolvemos. La Agencia de
            Acceso a la Información Pública es la autoridad de aplicación.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">6. Dónde viven los datos</h2>
          <p>
            En servidores propios con acceso restringido, copias de seguridad diarias y conexión
            cifrada (HTTPS). Guardamos los datos mientras tu cuenta exista; si pedís la baja, se
            eliminan salvo lo que la ley obligue a conservar.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">7. Cookies</h2>
          <p>
            Usamos solo las imprescindibles: la de tu sesión (para que no tengas que entrar cada
            vez) y la del tema claro/oscuro. Sin rastreadores de terceros.
          </p>
        </section>
      </div>

      <p className="mt-8 text-xs text-tinta-3">
        Ver también los <Link href="/terminos" className="font-semibold text-verde-txt">términos de uso</Link>.
      </p>
    </main>
  );
}
