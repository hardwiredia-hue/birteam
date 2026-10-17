import { usuarioActual } from '@/lib/auth';
import { clientesDelComplejo, haceRatoQueNoViene } from '@/lib/clientes';
import { respuestaCsv } from '@/lib/csv';

const ZONA = 'America/Argentina/Buenos_Aires';

/** "Tus clientes" en planilla (Excel o Google Sheets). Solo el dueño. */
export async function GET() {
  const usuario = await usuarioActual();
  if (!usuario || usuario.tipoCuenta !== 'CANCHA') {
    return new Response('Solo para cuentas de complejo.', { status: 403 });
  }
  const ahora = new Date();
  const clientes = await clientesDelComplejo(usuario.id, { ahora });
  const fecha = (d: Date | null) => (d ? d.toLocaleDateString('es-AR', { timeZone: ZONA }) : '');
  return respuestaCsv(
    [
      ['Nombre', 'Usuario', 'Teléfono', 'Turnos jugados', 'Faltas', 'Turnos reservados', 'Turno fijo', 'Última vez', 'Total de sus turnos', 'Hace rato que no viene'],
      ...clientes.map((c) => [
        c.nombre,
        c.usuario,
        c.telefono,
        c.jugados,
        c.faltas,
        c.proximos,
        c.fijo ? 'Sí' : 'No',
        fecha(c.ultimaVez),
        Math.round(c.gastado),
        haceRatoQueNoViene(c, ahora) ? 'Sí' : 'No',
      ]),
    ],
    `birteam-clientes-${ahora.toLocaleDateString('en-CA', { timeZone: ZONA })}.csv`
  );
}
