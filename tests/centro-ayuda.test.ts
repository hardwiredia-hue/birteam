import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { FRECUENTES, NOVEDADES, TEMAS, buscarArticulo } from '../src/lib/ayuda';

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

test('ayuda: novedades ordenadas y con links que existen', () => {
  const fechas = NOVEDADES.map((n) => n.fecha);
  assert.deepEqual(fechas, [...fechas].sort().reverse(), 'lo más reciente primero');
  const app = path.join(__dirname, '..', 'src', 'app');
  for (const novedad of NOVEDADES) {
    assert.match(novedad.fecha, /^\d{4}-\d{2}-\d{2}$/);
    if (!novedad.enlace) continue;
    const [conConsulta, ancla] = novedad.enlace.href.split('#');
    // La consulta (?tab=…) no cambia qué página es.
    const ruta = conConsulta.split('?')[0];
    const ayuda = ruta.match(/^\/ayuda\/([^/]+)$/);
    if (ayuda && ancla) {
      assert.ok(buscarArticulo(ayuda[1], ancla), `${novedad.titulo} → ${novedad.enlace.href}`);
    } else {
      const partes = ruta.split('/').filter(Boolean);
      assert.ok(
        ['', '(app)'].some((grupo) => existsSync(path.join(app, grupo, ...partes, 'page.tsx'))),
        `${novedad.titulo} → ${novedad.enlace.href}`
      );
    }
  }
});

test('ayuda: cada "¿Cómo funciona?" de la app lleva a un artículo que existe', () => {
  const archivos: string[] = [];
  const recorrer = (carpeta: string) => {
    for (const nombre of readdirSync(carpeta)) {
      const ruta = path.join(carpeta, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (ruta.endsWith('.tsx')) archivos.push(ruta);
    }
  };
  recorrer(path.join(__dirname, '..', 'src'));
  let enlaces = 0;
  for (const archivo of archivos) {
    const texto = readFileSync(archivo, 'utf8');
    for (const [, tema, articulo] of texto.matchAll(/<EnlaceAyuda\s+tema="([^"]+)"(?:\s+articulo="([^"]+)")?/g)) {
      enlaces++;
      if (articulo) assert.ok(buscarArticulo(tema, articulo), `${path.basename(archivo)} → ${tema}#${articulo}`);
      else assert.ok(TEMAS.some((t) => t.slug === tema), `${path.basename(archivo)} → ${tema}`);
    }
  }
  assert.ok(enlaces >= 10, `encontró ${enlaces} enlaces`);
});
