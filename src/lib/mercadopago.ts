import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { prisma } from './db';

/**
 * Mercado Pago como marketplace (Checkout Pro + OAuth). Cada complejo conecta
 * su propia cuenta: el cobro va directo a esa cuenta y birteam retiene solo
 * su comisión con `marketplace_fee`. birteam nunca guarda datos de tarjetas
 * ni retiene la plata de los jugadores.
 *
 * Ambiente necesario (ver deploy/PUBLICAR.md):
 *   MP_CLIENT_ID, MP_CLIENT_SECRET  credenciales de la aplicación de birteam
 *   MP_CLAVE_CIFRADO               64 caracteres hex (openssl rand -hex 32)
 *   MP_WEBHOOK_SECRET              clave secreta de webhooks de la aplicación
 *   URL_PUBLICA                    https://birteam.com (o staging)
 * Sin las tres primeras, el cobro online no aparece y todo sigue como antes.
 * MP_API_URL y MP_AUTH_URL solo se usan para apuntar a un servidor de prueba.
 *
 * Simulador de pagos: en staging (o desarrollo) se puede prender desde
 * Backoffice › Pagos para recorrer todo el circuito sin credenciales. Hace de
 * Mercado Pago dentro de la app, no mueve plata y en producción no se prende.
 */

const API = () => (process.env.MP_API_URL ?? 'https://api.mercadopago.com').replace(/\/$/, '');
const AUTH = () => (process.env.MP_AUTH_URL ?? 'https://auth.mercadopago.com').replace(/\/$/, '');

/** Minutos que el turno queda reservado mientras el jugador paga. */
export const MINUTOS_PARA_PAGAR = 15;

// ---- Simulador (solo staging y desarrollo) ----

/** ¿Este proceso es staging o desarrollo? Ante la duda, no (producción). */
export function simulacionPermitida() {
  if (process.env.NODE_ENV !== 'production') return true;
  if (process.cwd().startsWith('/home/birteam/staging')) return true;
  const marca = path.join(process.cwd(), '.ambiente');
  return existsSync(marca) && readFileSync(marca, 'utf8').trim() === 'staging';
}

/** Simulador prendido (Ajuste 'pagos_simulados') y permitido en este ambiente. */
export async function pagosSimulados() {
  if (!simulacionPermitida()) return false;
  const ajuste = await prisma.ajuste.findUnique({ where: { clave: 'pagos_simulados' } });
  return ajuste?.valor === '1';
}

/** ¿Hay cobro online disponible, real o simulado? */
export async function cobroOnlineHabilitado() {
  return (await pagosSimulados()) || mercadoPagoHabilitado();
}

/** La cuenta del dueño lista para operar: real (token) o del simulador. */
export interface CuentaActiva {
  token: string;
  simulada: boolean;
}

export function mercadoPagoHabilitado() {
  return Boolean(
    process.env.MP_CLIENT_ID &&
      process.env.MP_CLIENT_SECRET &&
      /^[0-9a-f]{64}$/i.test(process.env.MP_CLAVE_CIFRADO ?? '')
  );
}

export function urlPublica(request?: Request) {
  if (process.env.URL_PUBLICA) return process.env.URL_PUBLICA.replace(/\/$/, '');
  if (!request) return 'http://localhost:3000';
  const encabezados = new Headers(request.headers);
  const protocolo = encabezados.get('x-forwarded-proto') ?? 'http';
  const anfitrion = encabezados.get('x-forwarded-host') ?? encabezados.get('host') ?? 'localhost';
  return `${protocolo}://${anfitrion}`;
}

// ---- Cifrado de tokens (AES-256-GCM) ----

function clave() {
  return Buffer.from(process.env.MP_CLAVE_CIFRADO!, 'hex');
}

export function cifrar(texto: string) {
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', clave(), iv);
  const datos = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()]);
  return [iv, cifrador.getAuthTag(), datos].map((b) => b.toString('base64')).join('.');
}

export function descifrar(guardado: string) {
  const [iv, etiqueta, datos] = guardado.split('.').map((parte) => Buffer.from(parte, 'base64'));
  const descifrador = createDecipheriv('aes-256-gcm', clave(), iv);
  descifrador.setAuthTag(etiqueta);
  return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString('utf8');
}

// ---- Comisión de birteam ----

/** Porcentaje de comisión por pago online (Ajuste 'comision_porcentaje', 0 a 30). */
export async function comisionPorcentaje() {
  const ajuste = await prisma.ajuste.findUnique({ where: { clave: 'comision_porcentaje' } });
  const valor = Number(ajuste?.valor ?? 0);
  return Number.isFinite(valor) ? Math.min(30, Math.max(0, valor)) : 0;
}

/** Monto que se cobra online: seña (porcentaje) o el total, en pesos enteros. */
export function montoOnline(precio: number, cobro: string, senaPorcentaje: number) {
  if (cobro === 'TOTAL') return Math.round(precio);
  if (cobro === 'SENA') return Math.max(1, Math.round((precio * senaPorcentaje) / 100));
  return null;
}

// ---- OAuth del dueño ----

export function urlConexion(request: Request, estado: string, simulado = false) {
  if (simulado) return `${urlPublica(request)}/mp-simulado/autorizar?state=${estado}`;
  const parametros = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID!,
    response_type: 'code',
    platform_id: 'mp',
    state: estado,
    redirect_uri: `${urlPublica(request)}/api/mercadopago/volver`,
  });
  return `${AUTH()}/authorization?${parametros}`;
}

interface RespuestaToken {
  access_token: string;
  refresh_token?: string;
  user_id: number | string;
  expires_in: number;
}

async function pedirToken(cuerpo: Record<string, string>): Promise<RespuestaToken> {
  const respuesta = await fetch(`${API()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      ...cuerpo,
    }),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !datos.access_token) {
    throw new Error(`Mercado Pago no entregó el token (${respuesta.status}).`);
  }
  return datos;
}

/** Canjea el código del OAuth y guarda la cuenta del dueño (tokens cifrados). */
export async function conectarCuenta(usuarioId: string, codigo: string, request: Request, simulado = false) {
  if (simulado) {
    const datos = {
      mpUserId: 'simulado',
      accessToken: 'SIMULADO',
      refreshToken: null,
      expiraEn: new Date(Date.now() + 180 * 24 * 3600_000),
      simulada: true,
    };
    await prisma.cuentaMercadoPago.upsert({
      where: { usuarioId },
      create: { usuarioId, ...datos },
      update: { ...datos, conectadoEn: new Date() },
    });
    return;
  }
  const token = await pedirToken({
    grant_type: 'authorization_code',
    code: codigo,
    redirect_uri: `${urlPublica(request)}/api/mercadopago/volver`,
  });
  const datos = {
    mpUserId: String(token.user_id),
    accessToken: cifrar(token.access_token),
    refreshToken: token.refresh_token ? cifrar(token.refresh_token) : null,
    expiraEn: new Date(Date.now() + token.expires_in * 1000),
    simulada: false,
  };
  await prisma.cuentaMercadoPago.upsert({
    where: { usuarioId },
    create: { usuarioId, ...datos },
    update: { ...datos, conectadoEn: new Date() },
  });
}

/**
 * El access token vigente del dueño. Si vence en menos de 7 días lo renueva
 * (el refresh token también rota). Sin cuenta o sin poder renovar: null.
 */
export async function tokenDelDueno(usuarioId: string): Promise<CuentaActiva | null> {
  const cuenta = await prisma.cuentaMercadoPago.findUnique({ where: { usuarioId } });
  if (!cuenta) return null;
  if (cuenta.simulada) return { token: 'SIMULADO', simulada: true };
  const casiVencido = cuenta.expiraEn.getTime() - Date.now() < 7 * 24 * 3600_000;
  if (casiVencido && cuenta.refreshToken) {
    try {
      const token = await pedirToken({
        grant_type: 'refresh_token',
        refresh_token: descifrar(cuenta.refreshToken),
      });
      await prisma.cuentaMercadoPago.update({
        where: { id: cuenta.id },
        data: {
          accessToken: cifrar(token.access_token),
          refreshToken: token.refresh_token ? cifrar(token.refresh_token) : cuenta.refreshToken,
          expiraEn: new Date(Date.now() + token.expires_in * 1000),
        },
      });
      return { token: token.access_token, simulada: false };
    } catch {
      if (cuenta.expiraEn.getTime() < Date.now()) return null;
    }
  }
  if (cuenta.expiraEn.getTime() < Date.now()) return null;
  return { token: descifrar(cuenta.accessToken), simulada: false };
}

/** ¿El dueño puede cobrar online ahora mismo? */
export async function duenoCobraOnline(usuarioId: string) {
  const cuenta = await prisma.cuentaMercadoPago.findUnique({
    where: { usuarioId },
    select: { expiraEn: true, refreshToken: true, simulada: true },
  });
  if (!cuenta) return false;
  // Una cuenta simulada cobra solo con el simulador prendido; una real, solo con credenciales.
  if (cuenta.simulada) return pagosSimulados();
  if (!mercadoPagoHabilitado()) return false;
  return cuenta.expiraEn.getTime() > Date.now() || Boolean(cuenta.refreshToken);
}

// ---- Cobros ----

async function llamar(token: string, ruta: string, opciones: { metodo?: string; cuerpo?: unknown; idempotencia?: string } = {}) {
  const respuesta = await fetch(`${API()}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opciones.idempotencia ? { 'X-Idempotency-Key': opciones.idempotencia } : {}),
    },
    body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(`Mercado Pago respondió ${respuesta.status} en ${ruta}.`);
  }
  return datos;
}

export interface Preferencia {
  id: string;
  linkPago: string;
}

/** Crea el link de pago (Checkout Pro) a nombre del dueño, con la comisión de birteam. */
export async function crearPreferencia(
  cuenta: CuentaActiva,
  datos: {
    reservaId: string;
    titulo: string;
    monto: number;
    comision: number;
    venceEn: Date;
    email?: string | null;
    base: string;
  }
): Promise<Preferencia> {
  if (cuenta.simulada) {
    return {
      id: `sim-${datos.reservaId}`,
      linkPago: `${datos.base}/mp-simulado/pagar?reserva=${datos.reservaId}`,
    };
  }
  const vuelta = `${datos.base}/reservas/pago?reserva=${datos.reservaId}`;
  const preferencia = await llamar(cuenta.token, '/checkout/preferences', {
    metodo: 'POST',
    idempotencia: `pref-${datos.reservaId}`,
    cuerpo: {
      items: [
        { id: datos.reservaId, title: datos.titulo, quantity: 1, unit_price: datos.monto, currency_id: 'ARS' },
      ],
      ...(datos.email ? { payer: { email: datos.email } } : {}),
      external_reference: datos.reservaId,
      notification_url: `${datos.base}/api/pagos/webhook?reserva=${datos.reservaId}`,
      back_urls: { success: vuelta, pending: vuelta, failure: vuelta },
      auto_return: 'approved',
      // Aprobado o rechazado al instante: el turno no queda en el limbo.
      binary_mode: true,
      expires: true,
      expiration_date_to: datos.venceEn.toISOString(),
      ...(datos.comision > 0 ? { marketplace_fee: datos.comision } : {}),
      statement_descriptor: 'BIRTEAM',
    },
  });
  if (!preferencia.id || !preferencia.init_point) {
    throw new Error('Mercado Pago no devolvió el link de pago.');
  }
  return { id: String(preferencia.id), linkPago: String(preferencia.init_point) };
}

export interface PagoInformado {
  id: string;
  estado: string;
  estadoDetalle: string | null;
  referencia: string | null;
  monto: number;
  moneda: string;
  comision: number | null;
}

/** El pago tal cual lo tiene Mercado Pago: la única fuente válida para confirmar. */
export async function obtenerPago(cuenta: CuentaActiva, pagoId: string): Promise<PagoInformado> {
  if (cuenta.simulada) {
    const simulado = await prisma.pagoSimulado.findUnique({ where: { id: pagoId } });
    if (!simulado) throw new Error(`Pago simulado ${pagoId} inexistente.`);
    return {
      id: simulado.id,
      estado: simulado.estado,
      estadoDetalle: 'simulado',
      referencia: simulado.reservaId,
      monto: simulado.monto,
      moneda: 'ARS',
      comision: simulado.comision || null,
    };
  }
  const pago = await llamar(cuenta.token, `/v1/payments/${encodeURIComponent(pagoId)}`);
  const comision = Array.isArray(pago.fee_details)
    ? pago.fee_details
        .filter((fee: { type?: string }) => fee.type === 'application_fee')
        .reduce((suma: number, fee: { amount?: number }) => suma + (fee.amount ?? 0), 0)
    : null;
  return {
    id: String(pago.id),
    estado: String(pago.status),
    estadoDetalle: pago.status_detail ? String(pago.status_detail) : null,
    referencia: pago.external_reference ? String(pago.external_reference) : null,
    monto: Number(pago.transaction_amount ?? 0),
    moneda: String(pago.currency_id ?? ''),
    comision: comision || null,
  };
}

/** Devolución total del pago (idempotente: reintentar no devuelve dos veces). */
export async function reembolsar(cuenta: CuentaActiva, pagoId: string) {
  if (cuenta.simulada) {
    await prisma.pagoSimulado.update({ where: { id: pagoId }, data: { estado: 'refunded' } });
    return;
  }
  await llamar(cuenta.token, `/v1/payments/${encodeURIComponent(pagoId)}/refunds`, {
    metodo: 'POST',
    idempotencia: `reembolso-${pagoId}`,
    cuerpo: {},
  });
}

// ---- Webhook ----

/**
 * Valida la firma `x-signature` (ts=…,v1=…) con MP_WEBHOOK_SECRET sobre
 * "id:{data.id};request-id:{x-request-id};ts:{ts};". Sin secreto configurado
 * devuelve null (no se puede validar); igual el pago se verifica contra la API.
 */
export function firmaValida(request: Request, dataId: string): boolean | null {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (!secreto) return null;
  const firma = request.headers.get('x-signature') ?? '';
  const pedido = request.headers.get('x-request-id') ?? '';
  const partes = Object.fromEntries(
    firma.split(',').map((parte) => {
      const [k, ...v] = parte.split('=');
      return [k.trim(), v.join('=').trim()];
    })
  );
  if (!partes.ts || !partes.v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) && /[a-z]/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifiesto = `id:${id};request-id:${pedido};ts:${partes.ts};`;
  const esperado = createHmac('sha256', secreto).update(manifiesto).digest('hex');
  const a = Buffer.from(esperado);
  const b = Buffer.from(partes.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function registrarEvento(reservaId: string | null, tipo: string, detalle?: string) {
  await prisma.eventoPago.create({ data: { reservaId, tipo, detalle: detalle?.slice(0, 1000) ?? null } });
}

/** Crea un pago en el simulador (id numérico, como los de Mercado Pago). */
export async function crearPagoSimulado(reservaId: string, monto: number, comision: number, aprobado: boolean) {
  const id = `9${Date.now()}${randomInt(100, 999)}`;
  await prisma.pagoSimulado.create({
    data: { id, reservaId, monto, comision, estado: aprobado ? 'approved' : 'rejected' },
  });
  return id;
}
