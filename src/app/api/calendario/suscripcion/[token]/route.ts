import { prisma } from '@/lib/db';
import { calendarioIcs } from '@/lib/calendario';
import { eventosDelUsuario } from '@/lib/calendario-eventos';
import { permitir } from '@/lib/limite';

/**
 * El calendario sincronizado de alguien (Google Calendar, iPhone, Outlook lo
 * piden solos cada tanto). El link es secreto: quien lo tiene ve los partidos
 * y turnos de esa persona; se puede cambiar o apagar desde el perfil.
 */
export async function GET(_request: Request, contexto: { params: Promise<{ token: string }> }) {
  const { token } = await contexto.params;
  const limpio = token.replace(/\.ics$/, '');
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(limpio)) return new Response('No encontrado.', { status: 404 });

  const usuario = await prisma.usuario.findUnique({
    where: { tokenCalendario: limpio },
    select: { id: true, eliminadoEn: true },
  });
  if (!usuario || usuario.eliminadoEn) return new Response('No encontrado.', { status: 404 });
  if (!permitir(`calendario:${usuario.id}`, 60, 3600_000)) return new Response('Demasiados pedidos.', { status: 429 });

  return new Response(calendarioIcs(await eventosDelUsuario(usuario.id)), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="birteam.ics"',
      'Cache-Control': 'private, max-age=900',
      'X-Robots-Tag': 'noindex',
    },
  });
}
