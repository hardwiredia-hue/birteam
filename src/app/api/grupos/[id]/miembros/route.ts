import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { enviarPush } from '@/lib/push';

/**
 * Gestión de miembros del grupo: hacer-admin, quitar-admin o sacar.
 * Solo administradores; al creador del grupo no lo toca nadie.
 */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const grupo = await prisma.grupo.findUnique({
    where: { id },
    include: { miembros: true },
  });
  if (!grupo) return NextResponse.json({ error: 'Ese grupo no existe.' }, { status: 404 });

  const mia = grupo.miembros.find((m) => m.usuarioId === usuario.id);
  if (!mia || mia.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'A los miembros los gestionan los administradores.' }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => ({}));
  const usuarioId = String(cuerpo.usuarioId ?? '');
  const accion = String(cuerpo.accion ?? '');
  if (!usuarioId || !['hacer-admin', 'quitar-admin', 'sacar'].includes(accion)) {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
  }
  if (usuarioId === usuario.id) {
    return NextResponse.json({ error: 'Para vos mismo no: pedile a otro admin.' }, { status: 400 });
  }
  if (usuarioId === grupo.creadorId) {
    return NextResponse.json({ error: 'Quien creó el grupo no se toca.' }, { status: 400 });
  }
  const objetivo = grupo.miembros.find((m) => m.usuarioId === usuarioId);
  if (!objetivo) return NextResponse.json({ error: 'No es miembro del grupo.' }, { status: 404 });

  if (accion === 'sacar') {
    await prisma.miembroGrupo.delete({
      where: { grupoId_usuarioId: { grupoId: id, usuarioId } },
    });
    return NextResponse.json({ listo: true });
  }

  const rol = accion === 'hacer-admin' ? 'ADMIN' : 'MIEMBRO';
  await prisma.miembroGrupo.update({
    where: { grupoId_usuarioId: { grupoId: id, usuarioId } },
    data: { rol },
  });

  if (rol === 'ADMIN') {
    const aviso = {
      titulo: `Sos administrador de ${grupo.nombre}`,
      cuerpo: `${usuario.nombre} te dio el mando: podés editar el grupo y gestionar a los miembros.`,
      url: `/grupos/${grupo.id}`,
    };
    await prisma.notificacion.create({ data: { usuarioId, tipo: 'GRUPO_ADMIN', ...aviso } });
    await enviarPush(usuarioId, aviso);
  }

  return NextResponse.json({ listo: true });
}
