# Handoff: Birteam — sistema de diseño y pantallas móviles

## Overview
Birteam es una app deportiva argentina para organizar partidos ("¿Querés jugar? Encontrá con quién."). Este paquete contiene el sistema de diseño (paleta, tipografía, componentes) y 5 pantallas móviles (390px) en tema oscuro: Inicio, Partido, Crear partido, Explorar, Perfil.

## About the Design Files
Los archivos de este paquete son **referencias de diseño hechas en HTML** — prototipos que muestran la apariencia y el comportamiento esperados, no código de producción para copiar. La tarea es **recrear estos diseños en el entorno del código destino** (React Native, Flutter, SwiftUI, Kotlin, etc.) usando sus patrones y librerías. Si no hay entorno aún, elegir el framework más adecuado para una app móvil.

`Birteam.dc.html` es la fuente principal. `android-frame.jsx` y `support.js` son solo la infraestructura del prototipo (marco de teléfono y runtime); ignorarlos al implementar.

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía, espaciado, radios y copy son finales. Recrear pixel-perfect usando los componentes del codebase.

## Idioma
Todo el texto en español rioplatense con voseo ("Creá el partido", "Sumate", "Anotate"). Sin emojis en la interfaz.

## Design Tokens

### Color — tema oscuro (principal, por defecto)
- Fondo: `#0A0B08`
- Panel / tarjeta: `#12140D`
- Borde 1: `#272B19` · Borde 2 (controles): `#383E22`
- Texto: `#F4F6EA` · Secundario: `#BBC1A8` · Terciario: `#818872`
- Verde birteam (acento único): `#A8E617` · Texto sobre verde: `#0B0D03`

### Color — tema claro (opcional, se activa en Perfil)
- Fondo: `#F4F5EC` · Panel: `#FDFDF9`
- Bordes: `#DFE2D0` / `#C8CDB2`
- Texto: `#15180D` · Secundario: `#4A5039`
- Verde como texto: `#63970A` (el verde de fondo de botón sigue `#A8E617`)

### Estados
- Voy: verde `#A8E617`
- Tal vez: naranja `#F59E1E` (claro `#C46F06`)
- En espera: azul `#5A79FF` (claro `#3355E0`)
- No voy: gris `#767D67` (nunca rojo)
- Error / destructivo: rojo `#F0563C`

### Regla del verde
Un solo botón primario por pantalla. Verde además solo para: marca, estado "Voy", rótulo de deporte en tarjetas, ítem activo de la barra inferior, barra de progreso, foco de campos.

### Tipografía (Google Fonts)
- **Archivo** Italic 800/900, MAYÚSCULAS: títulos, horarios ("JUEVES 21:00"), cifras (92%, 8/10), estados grandes. Tamaños: 40/32/30/26/22/20/18 px, line-height 1–1.1.
- **Instrument Sans** 400/600: texto de lectura y botones. 16/15/14/13 px, line-height 1.4–1.6.
- **Spline Sans Mono** 400/500: rótulos, horarios, cupos, datos. 11px, letter-spacing 0.08–0.14em, mayúsculas. 12–14px para datos en línea. Números tabulares en listas.

### Espaciado
Escala de 4: 4 · 8 · 12 · 16 · 20 · 24 · 32. Padding lateral de pantalla: 20px.

### Radios
- 6px: botones, chips, campos, switch, tabs de filtro, botón "+" de la barra.
- 12px: tarjetas y paneles.
- 50%: solo avatares y puntitos de estado (8px).
- Sin píldoras.

### Íconos
Trazo 1.8px (1.5–1.6 en 16px), monocromos, 20×20 en barra inferior. Color `#818872` inactivo, `#A8E617` activo.

### Sombra
Solo el botón "+" central: `0 4px 14px rgba(168,230,23,0.35)`.

## Componentes

### Botones (Instrument Sans 600, radio 6px)
- **Primario**: fondo `#A8E617`, texto `#0B0D03`, padding 14px 24px, 15px. Uno por pantalla.
- **Secundario**: transparente, borde 1.5px `#383E22`, texto `#F4F6EA`.
- **Fantasma**: sin borde ni fondo, texto `#BBC1A8`.
- **Peligro**: transparente, borde 1.5px `#F0563C`, texto `#F0563C`.
- Tamaño compacto en tarjetas: 13px, padding 9–10px.

### Chips de estado
Inline-flex, gap 7px, padding 7px 12px, radio 6px, borde 1px `#272B19`, fondo `#12140D`, texto 13px/600. Puntito 8px redondo del color del estado. Variantes: Voy · Tal vez · No voy · En espera · 2º.

### Chips de selección (fecha/hora/filtros)
Spline Sans Mono 11–12px mayúsculas, padding 8–10px 12–14px, radio 6px. Inactivo: borde 1.5px `#383E22`, texto `#F4F6EA`. Activo: fondo `#A8E617`, texto `#0B0D03`.

### Campo
Rótulo mono 11px `#818872` arriba (gap 6px). Input: fondo `#0A0B08`, borde 1px `#272B19`, radio 6px, padding 12px 14px, texto 14px. Foco: borde `#A8E617`.

### Switch
Pista 40×22, radio 6px. Perilla 18×18, radio 4px, top 2px. On: pista `#A8E617`, perilla `#0B0D03` a left 20px. Off: pista `#383E22`, perilla `#BBC1A8` a left 2px. Transición left 150ms.

### Avatar
Redondo, fondo `#383E22`, iniciales en mono. 28px (listas/pila), 32px (tarjeta), 76px (perfil). En pila: borde 2px del color del panel, solapado -10px; último = "+N" con fondo `#272B19`.

### Barra de progreso
Alto 4px, radio 2px, pista `#272B19`, relleno `#A8E617`.

### Tarjeta de partido (componente estrella)
Fondo `#12140D`, borde 1px `#272B19`, radio 12px, padding 18–20px, gap 12–14px vertical:
1. Rótulo mono 11px verde: `FÚTBOL 5 · SE REPITE`
2. Horario Archivo Italic 26px: `JUEVES 21:00` + lugar 13–14px `#BBC1A8`
3. Pila de avatares
4. Fila mono `CUPO` / `8/10` + barra de progreso
5. Botonera Voy / Tal vez / No voy (3 botones flex:1, gap 8px). El seleccionado toma fondo verde; los otros, borde `#383E22`.

### Barra inferior
Alto 64px, fondo `#12140D`, borde superior 1px `#272B19`. 5 posiciones: Inicio · Explorar · "+" · Grupos · Perfil. Ícono 20px + rótulo mono 9px. Botón "+": 44×44, radio 6px, verde, sobresale 16px hacia arriba (margin-top -16px), con sombra verde.

## Screens

### 1. Inicio
- Cabecera: isotipo 22px, "Hola, Nacho" (14px `#BBC1A8`), fecha Archivo Italic 22px `MIÉRCOLES 11 SEP`.
- Sección `TU PRÓXIMO PARTIDO` (rótulo mono) → Tarjeta de partido completa con botonera RSVP (estado inicial: Voy).
- Sección `INVITACIONES`:
  - Tarjeta: "Martín te invitó a **Vóley playero** — Sábado 18:00, Costanera" + botones Aceptar (secundario) / Rechazar (fantasma).
  - Aviso de grupo con borde azul `#5A79FF`: "Fútbol Los Pibes: se liberó un lugar para el jueves. Sos **1º en la lista**, tenés 2 h para confirmar." Cuenta regresiva mono azul `01:58:32` + botón primario "Confirmar lugar".
- Barra inferior con Inicio activo.

### 2. Partido
- Cabecera: flecha atrás + rótulo verde `FÚTBOL 5 · SE REPITE`; `JUEVES 21:00` (30px); "Cancha El Potrero, Palermo"; "Organiza Nacho Bellini" (13px terciario).
- Cupo: mono `8/10 CONFIRMADOS · MÍNIMO 8 ✓` + barra 80%.
- Panel de costo: "$2.500 por jugador" · mono `PAGARON 6/8`.
- Listas con rótulo mono: `CONFIRMADOS · 8` (puntito verde), `TAL VEZ · 2` (naranja), `EN ESPERA · 1` (azul, con posición "1º"). Fila: avatar 28 + nombre 14px + puntito. Nombres: Nacho Bellini, Facu Martínez, Tomi Guzmán, Lucas Ferro, Mati Sosa, Juan Cruz Peña, Santi Roldán, Emi Duarte / Rodri Acosta, Gonza Ibáñez / Diego Paredes.
- Pie fijo (panel, borde superior): botón secundario "Compartir por WhatsApp" con ícono, y botón primario grande **VOY** (16px, padding 14px).

### 3. Crear partido (paso 2/6)
- Cabecera: flecha atrás + barra de progreso segmentada (6 segmentos, 3px, gap 4px; 2 verdes). Rótulo mono `PASO 2 DE 6`.
- Pregunta Archivo Italic 32px: `¿CUÁNDO JUEGAN?`
- `DÍA`: chips HOY · MAÑANA · JUEVES (activo) · VIERNES.
- `HORA`: chips 19:00 · 20:00 · 21:00 (activo) · 22:00.
- Switch "Se repite todas las semanas" (on), separado por borde superior.
- Pie: "Atrás" (fantasma, flex 1) + "Continuar" (primario, flex 2).

### 4. Explorar
- Título `EXPLORAR` 22px. Buscador (panel, borde, radio 6px, ícono lupa, placeholder "Buscar partidos, jugadores o grupos").
- Solapas Partidos / Jugadores / Grupos: 14px/600, activa texto `#F4F6EA` + subrayado 2px verde; inactivas `#818872`.
- Filtros (chips mono): `FÚTBOL 5` (activo), `ESTA SEMANA`, `< 5 KM`.
- Resultados (tarjeta 12px, padding 16px): rótulo deporte verde + distancia mono terciario a la derecha; horario Archivo 20px; lugar 13px; fila inferior estado (mono, color según estado) + precio 13px/600.
  - FÚTBOL 5 · JUEVES 21:00 · Cancha El Potrero, Palermo · 2.1 KM · "Faltan 2" (verde) · $2.500
  - PÁDEL · VIERNES 20:00 · Play Padel, Chacarita · 3.4 KM · "Falta 1" (naranja) · $3.000
  - VÓLEY PLAYERO · SÁBADO 18:00 · Costanera Sur · 4.8 KM · "Completo · anotate en espera" (azul) · $1.800
- Barra inferior con Explorar activo.

### 5. Perfil
- Avatar 76px "NB", nombre Archivo Italic 18px, mono `@nachobellini · Buenos Aires`.
- Tres estadísticas centradas: `92%` ASISTENCIA · `47` JUGADOS · `3` GRUPOS (Archivo 22px + mono 10px).
- `DEPORTES`: chips secundarios Fútbol 5 · Pádel · Vóley.
- `HISTORIAL`: filas con borde inferior — deporte 14px, mono `Jue 4 sep · El Potrero`, estado "Jugado" mono verde a la derecha. 4 filas.
- Ajustes: fila "Tema claro" con switch (off) · "Cerrar sesión" en rojo `#F0563C`.
- Barra inferior con Perfil activo.

## Interactions & Behavior
- RSVP (Inicio y Partido): tap en Voy / Tal vez / No voy cambia selección exclusiva; seleccionado = fondo verde, texto `#0B0D03`, borde verde.
- Switch: toggle con transición 150ms en la posición de la perilla.
- Solapas Explorar: cambio exclusivo, subrayado verde.
- Chips fecha/hora: selección exclusiva por grupo.
- Cuenta regresiva de lista de espera: 2 h desde la notificación, formato HH:MM:SS.
- Botón "+" central abre el asistente Crear partido (6 pasos).
- Botón "Compartir por WhatsApp": abre share sheet con link del partido.
- Barra de progreso de cupo: ancho = confirmados / cupo.

## State Management
- `rsvp` por partido: `'voy' | 'talvez' | 'no' | null`
- `match`: deporte, fecha/hora, lugar, organizador, cupo, mínimo, precio, pagos, repite (bool), listas confirmados/talvez/espera (ordenada).
- `createMatch`: paso actual (1–6), fecha, hora, repite.
- `explore`: tab activa, query, filtros (deporte, fecha, distancia), resultados.
- `settings.theme`: `'dark' | 'light'` (oscuro por defecto).
- Notificaciones de lista de espera con `expiresAt`.

## Assets
- `assets/birteam-iso.png` — isotipo "b" verde (app icon, favicon, cabecera Inicio).
- `assets/birteam-blanco.png` — logotipo blanco (tema oscuro).
- `assets/birteam-negro.png` — logotipo negro (tema claro).
- Íconos: SVG inline de trazo en el HTML (casa, lupa, grupos, perfil, más, atrás, WhatsApp). Reemplazar por el set de íconos del codebase con trazo 1.8px.
- Fuentes: Google Fonts — Archivo (ital 800/900), Instrument Sans (400/600), Spline Sans Mono (400/500).

## Files
- `Birteam.dc.html` — fundamentos + 5 pantallas (fuente principal). Estilos inline; la lógica de estado está en la clase `Component` al final del archivo.
- `android-frame.jsx`, `support.js` — infraestructura del prototipo, no implementar.
