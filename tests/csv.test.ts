import { test } from 'node:test';
import assert from 'node:assert/strict';
import { celda, respuestaCsv } from '../src/lib/csv';

test('CSV: celdas seguras y planilla para Excel', async () => {
  assert.equal(celda(null), '');
  assert.equal(celda('Juan'), 'Juan');
  assert.equal(celda('Pérez; Juan'), '"Pérez; Juan"');
  assert.equal(celda('dijo "hola"'), '"dijo ""hola"""');
  assert.equal(celda('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`, 'sin fórmulas');
  const bytes = Buffer.from(await respuestaCsv([['a', 1], ['b', null]], 'x.csv').arrayBuffer());
  // Arranca con el BOM (EF BB BF) para que Excel lea bien los acentos.
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.equal(bytes.subarray(3).toString('utf8'), 'a;1\r\nb;');
});
