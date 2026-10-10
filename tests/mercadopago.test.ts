import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import { cifrar, descifrar, firmaValida } from '../src/lib/mercadopago';

// La librería lee estas variables en cada llamada.
process.env.MP_CLAVE_CIFRADO = 'b'.repeat(64);
process.env.MP_WEBHOOK_SECRET = 'secreto-de-prueba';

function avisoFirmado(dataId: string, secreto: string, requestId = 'req-1') {
  const ts = '1700000000';
  const v1 = createHmac('sha256', secreto).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex');
  return new Request('http://localhost/api/pagos/webhook', {
    method: 'POST',
    headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId },
  });
}

test('los tokens se guardan cifrados y se recuperan', () => {
  const guardado = cifrar('APP_USR-token-secreto');
  assert.ok(!guardado.includes('APP_USR'));
  assert.equal(descifrar(guardado), 'APP_USR-token-secreto');
  // Mismo texto, cifrado distinto cada vez (IV aleatorio).
  assert.notEqual(cifrar('x'), cifrar('x'));
});

test('un token alterado no se puede descifrar', () => {
  const [iv, etiqueta, datos] = cifrar('token').split('.');
  const alterado = [iv, etiqueta, Buffer.from('otra cosa').toString('base64')].join('.');
  assert.throws(() => descifrar(alterado));
  assert.ok(datos);
});

test('firma de webhooks de Mercado Pago', () => {
  assert.equal(firmaValida(avisoFirmado('123456', 'secreto-de-prueba'), '123456'), true);
  assert.equal(firmaValida(avisoFirmado('123456', 'otro-secreto'), '123456'), false);
  // Firma válida para otro pago no sirve para este.
  assert.equal(firmaValida(avisoFirmado('999', 'secreto-de-prueba'), '123456'), false);
  // Sin encabezado de firma.
  assert.equal(firmaValida(new Request('http://localhost/x', { method: 'POST' }), '123456'), false);
  // Ids alfanuméricos: el manifiesto va en minúsculas.
  assert.equal(firmaValida(avisoFirmado('ord01abc', 'secreto-de-prueba'), 'ORD01ABC'), true);
});
