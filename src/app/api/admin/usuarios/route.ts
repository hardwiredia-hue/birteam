import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { adminActual } from '@/lib/admin';
import { enviarPush } from '@/lib/push';

export async function PATCH(request: Request) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });

  const cuerpo = await request.json().catch(() => ({}));
  const usuarioId = String(cuerpo.usuarioId ?? '');
  const rol = cuerpo.rol != null ? String(cuerpo.rol) : null;
  const suscripcion = cuerpo.suscripcion != null ? String(cuerpo.suscripcion) : null;
  const verificacion = cuerpo.verificacion != null ? String(cuerpo.verificacion) : null;
  if (!usuarioId || (!rol && !suscripcion && !verificacion)) {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
  }

  if (rol) {
    if (!['USUARIO', 'ADMIN'].includes(rol)) {
      return NextResponse.json({ error: 'Rol desconocido.' }, { status: 400 });
    }
    // Nadie se saca su propio admin: evita quedarse afuera del backoffice.
    if (usuarioId === admin.id) {
      return NextResponse.json({ error: 'Tu propio rol no se toca desde acá.' }, { status: 400 });
    }
    await prisma.usuario.update({ where: { id: usuarioId }, data: { rol } });
  }

  // Suscripción de dueño de cancha: 'activar' suma 30 días (desde hoy o desde
  // el vencimiento si todavía está activa); 'cortar' la corta ya.
  if (suscripcion) {
    if (!['activar', 'cortar'].includes(suscripcion)) {
      return NextResponse.json({ error: 'Acción de suscripción desconocida.' }, { status: 400 });
    }
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { suscripcionHasta: true },
    });
    if (!usuario) return NextResponse.json({ error: 'Ese usuario no existe.' }, { status: 404 });

    if (suscripcion === 'activar') {
      const ahora = new Date();
      const base =
        usuario.suscripcionHasta && usuario.suscripcionHasta > ahora
          ? usuario.suscripcionHasta
          : ahora;
      const hasta = new Date(base.getTime() + 30 * 24 * 3600 * 1000);
      await prisma.usuario.update({
        where: { id: usuarioId },
        data: { suscripcionHasta: hasta },
      });
    } else {
      await prisma.usuario.update({
        where: { id: usuarioId },
        data: { suscripcionHasta: null },
      });
    }
  }

  // Verificación de titularidad: la decide administración mirando el comprobante.
  if (verificacion) {
    if (!['VERIFICADA', 'RECHAZADA'].includes(verificacion)) {
      return NextResponse.json({ error: 'Estado de verificación desconocido.' }, { status: 400 });
    }
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, complejoNombre: true },
    });
    if (!usuario) return NextResponse.json({ error: 'Ese usuario no existe.' }, { status: 404 });

    await prisma.usuario.update({ where: { id: usuarioId }, data: { verificacion } });

    const aviso =
      verificacion === 'VERIFICADA'
        ? {
            titulo: 'Tu cuenta de dueño de cancha quedó verificada',
            cuerpo: `${usuario.complejoNombre ?? 'Tu complejo'} ya sale con el sello Verificada. Gracias por los papeles.`,
            url: '/perfil',
          }
        : {
            titulo: 'No pudimos verificar tu titularidad',
            cuerpo: 'El comprobante no alcanzó. Subí otro desde tu perfil (constancia de AFIP o factura de servicio del predio).',
            url: '/perfil',
          };
    await prisma.notificacion.create({
      data: { usuarioId, tipo: 'VERIFICACION', ...aviso },
    });
    await enviarPush(usuarioId, aviso);
  }

  return NextResponse.json({ listo: true });
}
