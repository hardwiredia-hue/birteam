import nodemailer from 'nodemailer';

/**
 * Envío de correo. Configuración por variables del ambiente:
 *   EMAIL_SMTP_URL   smtp://usuario:clave@servidor:587 (opcional)
 *   EMAIL_REMITENTE  "birteam <no-responder@birteam.com>"
 * Sin EMAIL_SMTP_URL usa el sendmail del sistema (el del servidor CWP).
 * En desarrollo, si no hay nada configurado, el correo se imprime en la
 * consola en vez de mandarse.
 */
function transporte() {
  if (process.env.EMAIL_SMTP_URL) return nodemailer.createTransport(process.env.EMAIL_SMTP_URL);
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({ sendmail: true, newline: 'unix', path: '/usr/sbin/sendmail' });
  }
  return null;
}

export async function enviarCorreo(opciones: { para: string; asunto: string; texto: string }) {
  const remitente = process.env.EMAIL_REMITENTE ?? 'birteam <no-responder@birteam.com>';
  const t = transporte();
  if (!t) {
    console.log(`[correo simulado] para: ${opciones.para} · ${opciones.asunto}\n${opciones.texto}`);
    return true;
  }
  try {
    await t.sendMail({
      from: remitente,
      to: opciones.para,
      subject: opciones.asunto,
      text: opciones.texto,
    });
    return true;
  } catch (error) {
    console.error('No salió el correo:', error);
    return false;
  }
}
