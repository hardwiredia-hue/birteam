export const metadata = { title: 'Grupos' };

export default function Grupos() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="t-pantalla">Grupos</h1>
      <div className="tarjeta p-5">
        <p className="t-rotulo !text-verde-txt">En construcción</p>
        <p className="mt-2 text-sm text-tinta-2">
          Tu gente: miembros, próximos partidos, historial, chat y el link de invitación para sumar
          jugadores por WhatsApp.
        </p>
      </div>
    </div>
  );
}
