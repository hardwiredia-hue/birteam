import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { ROTULOS_ESTADO } from '@/lib/reservas';

const ZONA = 'America/Argentina/Buenos_Aires';

/** Una celda CSV segura (comillas, y sin fórmulas que una planilla pueda ejecutar). */
function celda(valor: string | number | null | undefined) {
  if (valor == null) return '';
  let texto = String(valor);
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return /[";\n,]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * Informe de actividad del complejo en CSV (se abre con Excel o Google
 * Sheets): todas las reservas de sus canchas en el período, con lo cobrado
 * online y las devoluciones. ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD (por defecto,
 * los últimos 30 días y los próximos 14).
 */
export async function GET(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario || usuario.tipoCuenta !== 'CANCHA') {
    return new Response('Solo para cuentas de complejo.', { status: 403 });
  }
  const url = new URL(request.url);
  const valida = (valor: string | null) => (valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null);
  const hoy = new Date();
  const desde = valida(url.searchParams.get('desde')) ?? new Date(hoy.getTime() - 30 * 86400_000).toLocaleDateString('en-CA', { timeZone: ZONA });
  const hasta = valida(url.searchParams.get('hasta')) ?? new Date(hoy.getTime() + 14 * 86400_000).toLocaleDateString('en-CA', { timeZone: ZONA });

  const reservas = await prisma.reserva.findMany({
    where: { cancha: { duenoId: usuario.id }, fecha: { gte: desde, lte: hasta } },
    include: {
      cancha: { select: { nombre: true } },
      usuario: { select: { nombre: true, usuario: true } },
      pagos: { select: { estado: true, monto: true, comision: true, reembolsadoEn: true } },
    },
    orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
    take: 5000,
  });

  const encabezado = [
    'Fecha', 'Hora', 'Cancha', 'Jugador', 'Usuario', 'Estado', 'Precio del turno',
    'Cobrado online', 'Comisión birteam', 'Devuelto', 'Saldo a cobrar en el complejo', 'Radar', 'Nota', 'Motivo',
  ];
  const filas = reservas.map((reserva) => {
    const aprobados = reserva.pagos.filter((pago) => pago.estado === 'approved' || pago.estado === 'refunded');
    const cobrado = aprobados.reduce((suma, pago) => suma + pago.monto, 0);
    const devuelto = aprobados.filter((pago) => pago.reembolsadoEn).reduce((suma, pago) => suma + pago.monto, 0);
    const comision = aprobados.filter((pago) => !pago.reembolsadoEn).reduce((suma, pago) => suma + (pago.comision ?? 0), 0);
    const esBloqueo = reserva.estado === 'BLOQUEO';
    const saldo =
      reserva.estado === 'CONFIRMADA' && reserva.precio != null ? Math.max(0, reserva.precio - (cobrado - devuelto)) : null;
    return [
      reserva.fecha,
      reserva.hora,
      reserva.cancha.nombre,
      esBloqueo ? '(bloqueo del complejo)' : reserva.usuario.nombre,
      esBloqueo ? '' : reserva.usuario.usuario,
      ROTULOS_ESTADO[reserva.estado] ?? reserva.estado,
      reserva.precio,
      cobrado || null,
      comision || null,
      devuelto || null,
      saldo,
      reserva.ofertaId ? 'Sí' : '',
      reserva.nota,
      reserva.motivo,
    ];
  });

  // BOM para que Excel abra bien los acentos; separador ";" como usa Excel en es-AR.
  const contenido = '﻿' + [encabezado, ...filas].map((fila) => fila.map(celda).join(';')).join('\r\n');
  return new Response(contenido, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="birteam-reservas-${desde}-a-${hasta}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
