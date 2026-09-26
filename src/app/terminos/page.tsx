import Link from 'next/link';
import { Logotipo } from '@/components/marca';

export const metadata = { title: 'Términos de uso' };

export default function Terminos() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link href="/">
        <Logotipo ancho={100} />
      </Link>
      <h1 className="t-display mt-8 text-[28px]">Términos de uso</h1>
      <p className="t-rotulo mt-2">Última actualización: septiembre de 2026</p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-tinta-2">
        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">1. Qué es birteam</h2>
          <p>
            birteam es una plataforma para conectar personas que quieren hacer deporte: organizar
            partidos, armar grupos y torneos, y encontrar con quién jugar. Al crear una cuenta
            aceptás estos términos.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">2. Tu cuenta</h2>
          <p>
            Necesitás tener al menos 16 años. La cuenta es personal: los datos que cargás tienen
            que ser tuyos y reales, y sos responsable de mantener tu contraseña en secreto. Podés
            pedir la baja de tu cuenta escribiéndonos al contacto de abajo.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">3. Los encuentros son entre personas reales</h2>
          <p>
            Los partidos, entrenamientos y torneos los organizan los propios usuarios. birteam
            facilita el encuentro pero no participa, no verifica canchas ni personas, y no es
            responsable por lo que ocurra en los encuentros: lesiones, incumplimientos, pagos entre
            jugadores o daños. Usá el sentido común: encontrate en lugares públicos, revisá el
            perfil y el porcentaje de asistencia de quien no conozcas.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">4. La plata se arregla entre ustedes</h2>
          <p>
            El costo de la cancha u otros gastos se acuerdan y pagan directamente entre los
            jugadores. birteam no cobra, no intermedia ni garantiza esos pagos.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">5. Convivencia</h2>
          <p>
            No se permite: acoso, violencia o amenazas; discriminación; spam o venta no solicitada;
            perfiles falsos o suplantación; contenido ilegal o que no sea tuyo. Podés denunciar
            usuarios, partidos o publicaciones desde la propia app. Podemos suspender o dar de baja
            cuentas que rompan estas reglas, y bajar contenido denunciado mientras lo revisamos.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">6. Tu contenido</h2>
          <p>
            Las fotos y textos que publicás siguen siendo tuyos. Nos das permiso para mostrarlos
            dentro de birteam (que es para lo que los subiste). Si borrás tu cuenta, se dejan de
            mostrar.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">7. El servicio</h2>
          <p>
            birteam se ofrece como está, gratis en su versión base. Hacemos lo posible para que
            funcione siempre, sin garantizar disponibilidad continua. Podemos actualizar estos
            términos; si el cambio es importante, lo vamos a avisar dentro de la app.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-tinta">8. Contacto</h2>
          <p>
            Escribinos a <span className="text-tinta">hola@birteam.com</span>. Ley aplicable:
            República Argentina.
          </p>
        </section>
      </div>

      <p className="mt-8 text-xs text-tinta-3">
        Ver también la <Link href="/privacidad" className="font-semibold text-verde-txt">política de privacidad</Link>.
      </p>
    </main>
  );
}
