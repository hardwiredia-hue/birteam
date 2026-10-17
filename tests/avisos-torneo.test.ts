import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { avisarArranque, avisarInscripcion, avisarResultado, campeonDeLiga } from '../src/lib/avisos-torneo';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('avisos del torneo: inscripción, arranque, resultado y campeón', async () => {
  const sufijo = `tor${Date.now()}`;
  const { deporte, jugador, otro, dueno } = await escenario(sufijo);
  const torneo = await prisma.torneo.create({
    data: { nombre: `Copa ${sufijo}`, deporteId: deporte.id, organizadorId: jugador.id, maxEquipos: 2, estado: 'EN_JUEGO' },
  });
  const a = await prisma.equipoTorneo.create({ data: { torneoId: torneo.id, nombre: 'Los A', capitanId: otro.id } });
  const b = await prisma.equipoTorneo.create({ data: { torneoId: torneo.id, nombre: 'Los B', capitanId: dueno.id } });
  const url = `/torneos/${torneo.id}`;
  const avisos = (usuarioId: string) => prisma.notificacion.findMany({ where: { usuarioId, url }, orderBy: { creadoEn: 'asc' } });

  assert.equal(await avisarInscripcion(torneo.id, 'Los B', dueno.id), 1);
  assert.match((await avisos(jugador.id))[0].cuerpo ?? '', /Cupo completo/);
  assert.equal(await avisarInscripcion(torneo.id, 'X', jugador.id), 0, 'el organizador no se avisa a sí mismo');

  assert.equal(await avisarArranque(torneo.id), 2);

  const partido = await prisma.partidoTorneo.create({
    data: { torneoId: torneo.id, ronda: 1, localId: a.id, visitanteId: b.id, golesLocal: 3, golesVisitante: 1, jugadoEn: new Date() },
  });
  assert.equal(await avisarResultado(torneo.id, partido.id, a.id), 4, 'resultado a los dos capitanes y campeón a todos');
  const deOtro = await avisos(otro.id);
  assert.deepEqual(deOtro.map((n) => n.titulo), [`Arrancó Copa ${sufijo}`, 'Los A 3 - 1 Los B', `Los A, campeón de Copa ${sufijo}`]);
  assert.equal(await campeonDeLiga(torneo.id), a.id);
});
