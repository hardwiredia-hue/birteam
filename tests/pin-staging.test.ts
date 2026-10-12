import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { PIN_VALIDO, cookieValida, firmaDelPin } from '../src/lib/pin-staging';

test('PIN de staging: la cookie de acceso vale solo para el PIN vigente', async () => {
  const hash = await bcrypt.hash('482913', 4);
  const otro = await bcrypt.hash('111111', 4);
  const cookie = firmaDelPin(hash);
  assert.equal(cookieValida(hash, cookie), true);
  assert.equal(cookieValida(otro, cookie), false, 'cambiar el PIN invalida las cookies viejas');
  assert.equal(cookieValida(hash, undefined), false);
  assert.equal(cookieValida(hash, 'cualquier-cosa'), false);
});

test('PIN de staging: de 4 a 8 números', () => {
  assert.ok(PIN_VALIDO.test('4829'));
  assert.ok(PIN_VALIDO.test('48291300'));
  assert.ok(!PIN_VALIDO.test('482'));
  assert.ok(!PIN_VALIDO.test('482913001'));
  assert.ok(!PIN_VALIDO.test('48a9'));
});
