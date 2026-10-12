/**
 * Agregar al calendario: archivo .ics (iPhone, Android, Outlook) y link de
 * Google Calendar. Las horas van en UTC, así el calendario las muestra en
 * la zona de cada uno.
 */

export interface EventoCalendario {
  /** Único y estable (el calendario lo usa para no duplicar). */
  uid: string;
  titulo: string;
  inicio: Date;
  minutos: number;
  lugar?: string | null;
  descripcion?: string | null;
  url?: string | null;
  /** Se repite todas las semanas (turno fijo, partido semanal). */
  semanal?: boolean;
}

/** 20261014T000000Z */
function fechaUtc(instante: Date) {
  return instante.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Escapa texto según RFC 5545 (barra, punto y coma, coma y saltos de línea). */
function escapar(texto: string) {
  return texto.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Corta las líneas largas a 75 bytes, como pide el formato (sin partir caracteres). */
function plegar(linea: string) {
  const partes: string[] = [];
  let actual = '';
  let bytes = 0;
  for (const caracter of linea) {
    const tam = Buffer.byteLength(caracter);
    if (bytes + tam > (partes.length === 0 ? 75 : 74)) {
      partes.push(actual);
      actual = '';
      bytes = 0;
    }
    actual += caracter;
    bytes += tam;
  }
  partes.push(actual);
  return partes.join('\r\n ');
}

export function archivoIcs(evento: EventoCalendario, ahora = new Date()) {
  const fin = new Date(evento.inicio.getTime() + evento.minutos * 60_000);
  const descripcion = [evento.descripcion, evento.url].filter(Boolean).join('\n');
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//birteam//birteam.com//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${evento.uid}@birteam.com`,
    `DTSTAMP:${fechaUtc(ahora)}`,
    `DTSTART:${fechaUtc(evento.inicio)}`,
    `DTEND:${fechaUtc(fin)}`,
    ...(evento.semanal ? ['RRULE:FREQ=WEEKLY'] : []),
    `SUMMARY:${escapar(evento.titulo)}`,
    ...(evento.lugar ? [`LOCATION:${escapar(evento.lugar)}`] : []),
    ...(descripcion ? [`DESCRIPTION:${escapar(descripcion)}`] : []),
    ...(evento.url ? [`URL:${evento.url}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapar(evento.titulo)}`,
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lineas.map(plegar).join('\r\n') + '\r\n';
}

export function enlaceGoogle(evento: EventoCalendario) {
  const fin = new Date(evento.inicio.getTime() + evento.minutos * 60_000);
  const parametros = new URLSearchParams({
    action: 'TEMPLATE',
    text: evento.titulo,
    dates: `${fechaUtc(evento.inicio)}/${fechaUtc(fin)}`,
    ...(evento.lugar ? { location: evento.lugar } : {}),
    details: [evento.descripcion, evento.url].filter(Boolean).join('\n'),
    ...(evento.semanal ? { recur: 'RRULE:FREQ=WEEKLY' } : {}),
  });
  return `https://calendar.google.com/calendar/render?${parametros.toString()}`;
}
