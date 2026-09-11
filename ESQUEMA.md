# birteam — Esquema de la aplicación

**¿Querés jugar? Encontrá con quién.**
Plataforma deportiva argentina para conectar personas, grupos y equipos, y organizar
partidos, entrenamientos, salidas y competencias.

- **Métrica norte:** partidos jugados por semana. Organizar un partido en birteam tiene
  que ser más fácil que hacerlo por WhatsApp; todo lo que no empuje eso, espera.
- **Las dos puertas** (pantalla de arranque tras registrarse):
  **YA TENGO UN GRUPO** → crear grupo y organizar · **BUSCO CON QUIÉN JUGAR** → explorar.
- **Lanzamiento:** Buenos Aires, Córdoba, Santa Fe, Salta, Tucumán, Chaco y Mendoza.
  Después, el resto del país.
- **Diseño:** carpeta [`diseno/`](diseno/README.md) — fuente única de verdad visual.
  Tema oscuro principal, claro opcional. Voseo siempre.

---

## 1 · Los cinco conceptos

El usuario entiende la app con cinco piezas, ni una más:

| Pieza | Qué es |
|---|---|
| **Perfil** | Quién sos: deportes, zona, % de asistencia, historial, jugadas publicadas. |
| **Grupo** | Tu gente. Cuando compita en torneos, un grupo se presenta "como equipo" (fase 3). |
| **Partido** | El evento: deporte, fecha (única o recurrente), lugar, cupo, costo, visibilidad. |
| **Confirmación** | Voy / Tal vez / No voy + lista de espera numerada con reemplazo automático. |
| **Jugada** | Publicación social (clip o fotos) atada a un partido real. El feed de birteam. |

Estados con color fijo en toda la app (salen del lema Organizá·Jugá·Compartí):
**Voy** verde · **Tal vez** naranja · **En espera** azul · **No voy** gris (nunca rojo).

---

## 2 · Navegación

**Fase 1** (como en `diseno/`): barra inferior de 5 posiciones
`Inicio · Explorar · ➕ · Grupos · Perfil`

**Fase 2** (cuando llega el feed): `Inicio · Explorar · ➕ · Jugadas · Perfil`
Grupos pasa a vivir en Inicio (sección "Tus grupos") y en Perfil. La barra cambia
una sola vez y con el feed ya cargado de contenido; nunca se lanza un feed vacío.

Siempre: campana de notificaciones arriba a la derecha. Un solo botón verde por pantalla.

---

## 3 · Módulos y pantallas

### 3.1 Acceso
- **Registro en 30 segundos**: nombre → usuario → contraseña → deportes (hasta 5, el
  1º es el principal) → ciudad (autocompletado: escribís "mar del" y se completan
  ciudad/provincia/país/coordenadas) → las dos puertas.
- Entrar · Recuperar contraseña.
- **Vista pública de partido** (el link de WhatsApp): cualquiera lo ve sin cuenta;
  para confirmar "Voy" crea usuario en 30 segundos. Cada partido compartido trae
  jugadores nuevos.

### 3.2 Inicio
- Tarjeta grande **Tu próximo partido** con botonera Voy / Tal vez / No voy.
- **Pendientes**: invitaciones sin responder (Aceptar / Rechazar).
- **Avisos**: "Se liberó un lugar — sos 1º en la lista, tenés 2 h" con cuenta
  regresiva `HH:MM:SS` y botón "Confirmar lugar".
- Tus grupos y su actividad reciente.
- Vacío = las dos puertas + partidos abiertos cerca. Nunca una pantalla desierta.

### 3.3 Explorar
- Buscador + solapas **Partidos / Jugadores / Grupos**.
- Filtros: deporte, distancia (radio), fecha. Resultados con distancia, estado del
  cupo ("Faltan 2") y precio.
- Fase 2: vista de mapa.

### 3.4 Partido (la pantalla más importante)
- Cabecera: deporte, horario, lugar, organizador, sello "se repite".
- Cupo: `8/10 CONFIRMADOS · MÍNIMO 8 ✓` + barra de progreso.
- **La plata**: costo por jugador, `PAGARON 6/8` (lo marca el organizador a mano;
  el cobro es entre ellos — sin pagos dentro de la app en fase 1).
- Listas: Confirmados / Tal vez / En espera (numerada).
- **Chat del partido.**
- Pie fijo: "Compartir por WhatsApp" + botón grande **VOY**.
- Modo organizador: editar, cerrar lista, cancelar, delegar co-organizador.
- **Post-partido**: pasar lista (quién vino, un tap por jugador — alimenta el % de
  asistencia), resultado opcional, y "Subí la jugada" → publicación social (fase 2).

### 3.5 Crear partido — un paso por pantalla (6 pasos)
1. Deporte · 2. Cuándo (chips de día y hora + "se repite todas las semanas")
3. Dónde (autocompletado + dirección) · 4. Cupo y mínimo · 5. Costo total o por jugador
6. Visibilidad (solo mi grupo / abierto a cercanos) + invitar (grupo, usuarios, link).

**Reglas del partido:** estados `Armándose → Confirmado (llegó al mínimo) → Jugado →
Cancelado`. Si a las 24 h del inicio no llega al mínimo, avisa a todos. Recurrente:
cada edición nueva resetea confirmaciones. Tal vez no ocupa cupo y debe reconfirmar
2 h antes. Lista de espera FIFO: al liberarse un lugar, el 1º recibe invitación con
2 h de vencimiento; si no contesta, pasa al siguiente.

### 3.6 Grupos
- Mis grupos → **Grupo**: miembros y roles (admin), próximos partidos, historial,
  chat, link de invitación.
- Crear grupo: nombre, deporte, zona, foto.
- "Competir como equipo" (escudo, plantel formal): apagado con sello "Próximamente"
  hasta la fase de torneos.

### 3.7 Perfil
- Propio: avatar, @usuario, ciudad, **92% asistencia · 47 jugados · 3 grupos**,
  deportes, historial, jugadas publicadas (fase 2), ajustes.
- Ajeno: lo mismo + "Invitar a un partido". El % de asistencia es lo que mirás antes
  de aceptar a un desconocido.
- Ajustes: editar perfil, tema claro/oscuro, notificaciones, privacidad,
  usuarios bloqueados, cerrar sesión.

### 3.8 Jugadas — la parte social (fase 2)
Feed vertical estilo TikTok/Instagram, con una diferencia que nadie más tiene:
**cada jugada puede estar atada a un partido real** — el video del gol linkea al
partido, al grupo y a los que estuvieron.
- **Feed**: pantalla completa, deslizar vertical. Cabecera de cada jugada: autor,
  deporte y "Fútbol 5 · El Potrero · jueves" (link al partido). Acciones: me gusta,
  comentarios, compartir, seguir.
- **Publicar**: desde el partido jugado ("Subí la jugada del jueves") o desde ➕.
  Clip corto (≤60 s) o hasta 5 fotos + texto. Etiquetar compañeros.
- **Comentarios** y respuestas. **Seguir** usuarios y grupos.
- Orden del feed: primero tu red (grupos, seguidos, compañeros de partido) y tu
  zona/deportes; descubrimiento después.
- Escalonado dentro de la fase 2: primero fotos en grupos y perfiles, después clips,
  después el feed vertical completo. Nunca un feed vacío el día del lanzamiento.

### 3.9 Notificaciones
Centro de notificaciones + push: invitación · lugar liberado (countdown) ·
recordatorio 24 h a los que no respondieron · "reconfirmá" 2 h antes a los Tal vez ·
partido confirmado/cancelado/modificado · social (me gusta, comentario, etiqueta —
fase 2).

### 3.10 Chat
Fase 1: chat de partido y de grupo (texto y foto). Fase 2: mensajes directos.

### 3.11 Moderación y seguridad
Jugás con desconocidos: **Reportar** (usuario, partido, jugada) y **Bloquear** desde
el día uno. Términos y privacidad en el registro. Sin esto no se lanza.

### 3.12 Backoffice (web, solo admin)
Usuarios · deportes · geografía (países/provincias/ciudades con coordenadas) ·
denuncias · métricas (partidos jugados por semana, la métrica norte).

---

## 4 · Modelo de datos (alto nivel)

`Usuario` (deportes, ciudad+coords, radio, % asistencia) · `Deporte` ·
`Grupo` / `Miembro` (rol) · `Partido` (deporte, fecha, recurrencia, lugar+coords,
cupo, mínimo, costo, visibilidad, estado, organizador, co-organizador) ·
`Participación` (estado voy/talvez/no/espera, orden en espera, vencimiento de
invitación, pagó, asistió) · `Jugada` (autor, partido?, media, texto) ·
`Comentario` · `Reacción` · `Seguimiento` · `Mensaje` (partido/grupo) ·
`Notificación` (tipo, vencimiento) · `Denuncia` · `Bloqueo`.

---

## 5 · Fases

| | Qué entra |
|---|---|
| **Fase 1 — Lanzamiento** | Registro 30 s, perfil, grupos, crear partido (6 pasos, recurrentes), RSVP + cupos + lista de espera con countdown, costo manual, explorar por cercanía, invitación por link, chat de partido/grupo, notificaciones push, % de asistencia + pasar lista, reportar/bloquear, backoffice mínimo, tema oscuro/claro. 7 provincias. |
| **Fase 2 — Comunidad** | Jugadas (fotos → clips → feed vertical), seguir, comentarios, resultados e historial enriquecido, estadísticas y ranking, comunidades por deporte/zona, mensajes directos, mapa en Explorar. |
| **Fase 3 — Competencia y negocio** | Equipos formales y torneos, premium, publicidad y sponsors (clubes, gimnasios, comercios), reservas de canchas y comisiones, Jugar Online (trivia, desafíos). |

El modelo de negocio se enchufa encima cuando haya partidos jugados por semana;
nada de la fase 1 depende de cobrar.
