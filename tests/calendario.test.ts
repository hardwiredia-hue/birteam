import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { archivoIcs, enlaceGoogle } from '../src/lib/calendario';
import { eventoDe } from '../src/lib/calendario-eventos';
import { claveOcupa } from '../src/lib/reservas';
import { escenario, turno } from './ayuda';

after(() => prisma.$disconnect());

const evento = {
  uid: 'partido-abc',
  titulo: 'Fútbol 5 · La Redonda, sede norte; cancha 2',
  inicio: new Date('2026-10-14T00:00:00Z'), // 21:00 en Argentina
  minutos: 90,
  lugar: 'La Redonda, Av. Siempreviva 742',
  descripcion: 'Partido armado en birteam.\nLlevar pechera.',
  url: 'https://birteam.com/partidos/abc',
};

test('calendario: archivo .ics válido, con horas en UTC, texto escapado y aviso 1 h antes', () => {
  const ics = archivoIcs({ ...evento, semanal: true }, new Date('2026-10-12T10:00:00Z'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(ics, /DTSTART:20261014T000000Z\r\n/);
  assert.match(ics, /DTEND:20261014T013000Z\r\n/);
  assert.match(ics, /RRULE:FREQ=WEEKLY\r\n/);
  assert.match(ics, /TRIGGER:-PT1H/);
  assert.match(ics, /UID:partido-abc@birteam\.com/);
  // Comas, punto y coma y saltos de línea escapados.
  assert.ok(ics.replace(/\r\n /g, '').includes('SUMMARY:Fútbol 5 · La Redonda\\, sede norte\; cancha 2'));
  assert.ok(ics.replace(/\r\n /g, '').includes('DESCRIPTION:Partido armado en birteam.\\nLlevar pechera.'));
  // Ninguna línea pasa los 75 bytes.
  for (const linea of ics.split('\r\n')) assert.ok(Buffer.byteLength(linea) <= 75, linea);
});

test('calendario: link de Google con fechas, lugar y repetición', () => {
  const url = new URL(enlaceGoogle({ ...evento, semanal: true }));
  assert.equal(url.hostname, 'calendar.google.com');
  assert.equal(url.searchParams.get('dates'), '20261014T000000Z/20261014T013000Z');
  assert.equal(url.searchParams.get('location'), evento.lugar);
  assert.equal(url.searchParams.get('recur'), 'RRULE:FREQ=WEEKLY');
});

test('calendario: solo quien tiene el turno (o lo gestiona) lo puede agendar', async () => {
  const { dueno, jugador, otro, cancha } = await escenario('calendario');
  const { fecha, inicio } = turno(2, '20:00');
  const reserva = await prisma.reserva.create({
    data: {
      canchaId: cancha.id,
      usuarioId: jugador.id,
      fecha,
      hora: '20:00',
      inicio,
      estado: 'CONFIRMADA',
      ocupa: claveOcupa(cancha.id, fecha, '20:00'),
    },
  });
  assert.equal((await eventoDe('reserva', reserva.id, jugador.id))?.titulo, `Turno · ${cancha.nombre}`);
  assert.ok(await eventoDe('reserva', reserva.id, dueno.id));
  assert.equal(await eventoDe('reserva', reserva.id, otro.id), null);
});
