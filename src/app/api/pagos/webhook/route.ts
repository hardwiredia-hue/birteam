import { NextResponse } from 'next/server';
import { procesarPago } from '@/lib/cobros';
import { firmaValida, registrarEvento } from '@/lib/mercadopago';

/**
 * Avisos de Mercado Pago. La URL lleva la reserva (?reserva=…) y Mercado
 * Pago agrega el id del pago. Con MP_WEBHOOK_SECRET se valida la firma; en
 * cualquier caso el pago se consulta a la API antes de confirmar nada.
 * Responde 200 rápido para que Mercado Pago no reintente sin motivo.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const cuerpo = await request.json().catch(() => ({}) as Record<string, unknown>);
  const tipo = String(url.searchParams.get('type') ?? url.searchParams.get('topic') ?? cuerpo.type ?? cuerpo.topic ?? '');
  const datos = (cuerpo.data ?? {}) as { id?: string | number };
  const pagoId = String(url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? datos.id ?? '');
  const reservaId = url.searchParams.get('reserva') ?? '';

  if (tipo !== 'payment' || !pagoId || !reservaId) {
    return NextResponse.json({ ignorado: true });
  }

  const firma = firmaValida(request, pagoId);
  if (firma === false) {
    await registrarEvento(reservaId, 'FIRMA_INVALIDA', `pago ${pagoId}`);
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
  }

  try {
    const resultado = await procesarPago(reservaId, pagoId);
    return NextResponse.json(resultado);
  } catch (error) {
    await registrarEvento(reservaId, 'ERROR_WEBHOOK', `${pagoId}: ${(error as Error).message}`);
    // 500: Mercado Pago reintenta más tarde.
    return NextResponse.json({ error: 'No se pudo procesar.' }, { status: 500 });
  }
}
