import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { FRECUENTES, TEMAS, buscarArticulo } from '../src/lib/ayuda';

test('ayuda: temas y artículos con identificador único', () => {
  const slugs = TEMAS.map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const tema of TEMAS) {
    const ids = tema.articulos.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length, `ids repetidos en ${tema.slug}`);
    for (const articulo of tema.articulos) {
      assert.ok(articulo.titulo && articulo.texto.length + (articulo.pasos?.length ?? 0) > 0, `${tema.slug}#${articulo.id} vacío`);
    }
  }
});

test('ayuda: las frecuentes apuntan a artículos que existen', () => {
  for (const [slug, id] of FRECUENTES) assert.ok(buscarArticulo(slug, id), `${slug}#${id}`);
});

test('ayuda: los atajos llevan a pantallas que existen', () => {
  const app = path.join(__dirname, '..', 'src', 'app');
  // Rutas de la app: con o sin el grupo (app), y "[id]" para los segmentos dinámicos.
  const existe = (ruta: string) =>
    ['', '(app)'].some((grupo) => existsSync(path.join(app, grupo, ...ruta.split('/').filter(Boolean), 'page.tsx')));
  for (const tema of TEMAS) {
    for (const articulo of tema.articulos) {
      if (!articulo.enlace) continue;
      const ruta = articulo.enlace.href.split(/[?#]/)[0];
      assert.ok(ruta === '/' || existe(ruta), `${tema.slug}#${articulo.id} → ${articulo.enlace.href}`);
    }
  }
});
