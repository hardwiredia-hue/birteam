# birteam

**¿Querés jugar? Encontrá con quién.** Plataforma deportiva argentina para
organizar partidos, armar grupos y encontrar con quién jugar.

- **[ESQUEMA.md](ESQUEMA.md)** — el mapa completo del producto: conceptos,
  pantallas, reglas y fases.
- **[diseno/](diseno/README.md)** — el sistema de diseño (fuente única de
  verdad visual): tokens, componentes, pantallas y logos.
- **[deploy/PUBLICAR.md](deploy/PUBLICAR.md)** — cómo se publica:
  rama `staging` → staging.birteam.com · rama `produccion` → birteam.com.

## Desarrollo

```bash
cp .env.example .env
npm install
npx prisma db push   # crea la base local (SQLite)
npm run db:seed      # siembra los deportes
npm run dev          # http://localhost:3000
```

Stack: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4 ·
Prisma (SQLite en desarrollo, PostgreSQL en el servidor).

## Reglas del proyecto

- El diseño manda: todo sale de `diseno/` (tema oscuro por defecto, voseo,
  un botón verde por pantalla, radios de 6/12 px, sin emojis en la interfaz).
- Los valores "enum" viven en `src/lib/constantes.ts` (SQLite no tiene enums).
- Antes de programar una pantalla nueva, se diseña y se aprueba.
