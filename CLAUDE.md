# birteam: reglas del proyecto

## Ayuda: cada función nueva actualiza la ayuda

El centro de ayuda (`/ayuda`) sale de `src/lib/ayuda.ts`. **Toda función nueva
o cambio que el usuario note suma o corrige su artículo ahí, en el mismo
commit.**

- Un tema por área (`TEMAS`) y artículos cortos: qué es, cómo se hace
  (`pasos`) y un `enlace` a la pantalla donde se hace.
- Los números que se citan (horas, minutos, topes) tienen que ser los del
  código. Si cambia el código, cambia el texto.
- Si la pregunta es de las que más se hacen, sumarla a `FRECUENTES`.
- Lo que el usuario nota suma su línea en `NOVEDADES` (arriba de todo, con la
  fecha del día): se ve en /ayuda y en /ayuda/novedades.
- Una pantalla nueva con algo para explicar lleva su atajo
  `<EnlaceAyuda tema="…" articulo="…" />` (`src/components/ayuda.tsx`).

## Estilo

- Marca en `diseno/README.md`: lima #A8E617 sobre oscuro, títulos Archivo
  itálica en mayúsculas, rótulos Spline Sans Mono, sin emojis, un solo botón
  primario por pantalla.
- Textos en español rioplatense (vos), cortos y concretos.
- Código, nombres y comentarios en español, como el resto del repo.

## Revisar antes de subir

- `npm run revisar` (tipos) y `npm test` (node:test sobre una base SQLite de
  prueba). En desarrollo la base es SQLite; en el servidor, PostgreSQL.
- No correr `npm run build` con `npm run dev` levantado (rompe los chunks del
  dev): frenar el dev antes o borrar `.next` y volver a levantarlo.
- Después de tocar `prisma/schema.prisma`, reiniciar el dev (cliente viejo).

## Deploy

- Rama `staging` → staging; rama `produccion` → producción. Cada push publica
  por GitHub Actions (`.github/workflows/publicar.yml` + `deploy/publicar.sh`).
- Promover a producción solo lo que ya pasó en staging:
  `git push origin origin/staging:refs/heads/produccion`.
- Nunca empujar staging y producción a la vez: comparten servidor y compilar
  los dos juntos lo deja sin recursos (además hay un lock en el script).
- No borrar ni resetear bases sin consentimiento explícito. No mostrar el
  contenido de `.env.production` ni secretos.
