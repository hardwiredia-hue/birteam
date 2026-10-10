import { prisma } from '../src/lib/db';

/** Datos mínimos y propios de cada prueba (base SQLite de prueba, se resetea en npm test). */
export async function escenario(sufijo: string) {
  const deporte = await prisma.deporte.create({
    data: { nombre: `Fútbol prueba ${sufijo}`, slug: `futbol-prueba-${sufijo}`, orden: 99 },
  });
  const dueno = await prisma.usuario.create({
    data: {
      nombre: 'Dueño Prueba',
      usuario: `dueno-${sufijo}`,
      email: `dueno-${sufijo}@prueba.test`,
      tipoCuenta: 'CANCHA',
      suscripcionHasta: new Date(Date.now() + 30 * 86400_000),
    },
  });
  const jugador = await prisma.usuario.create({
    data: { nombre: 'Jugador Prueba', usuario: `jugador-${sufijo}`, email: `jugador-${sufijo}@prueba.test` },
  });
  const otro = await prisma.usuario.create({
    data: { nombre: 'Otro Prueba', usuario: `otro-${sufijo}`, email: `otro-${sufijo}@prueba.test` },
  });
  const cancha = await prisma.cancha.create({
    data: {
      duenoId: dueno.id,
      nombre: `Cancha ${sufijo}`,
      deporteId: deporte.id,
      direccion: 'Calle Falsa 123',
      precioPorHora: 30000,
      horaApertura: 9,
      horaCierre: 23,
      duracionTurno: 60,
      cobroOnline: 'SENA',
      senaPorcentaje: 30,
    },
  });
  return { deporte, dueno, jugador, otro, cancha };
}

/** Un turno dentro de `dias` días a la hora dada, en el formato de la app. */
export function turno(dias: number, hora: string) {
  const fecha = new Date(Date.now() + dias * 86400_000).toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  return { fecha, hora, inicio: new Date(`${fecha}T${hora}:00-03:00`) };
}
