import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { cerrarEncuesta, crearEncuesta, encuestaAbierta, encuestasSinMiVoto, rotuloOpcion, votar } from '../src/lib/encuestas';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('¿Cuándo jugamos?: proponer, votar, una abierta por grupo y cerrar', async () => {
  const sufijo = `enc${Date.now()}`;
  const { deporte, jugador, otro, dueno } = await escenario(sufijo);
  const grupo = await prisma.grupo.create({
    data: {
      nombre: `Grupo ${sufijo}`,
      slug: `grupo-${sufijo}`,
      deporteId: deporte.id,
      creadorId: jugador.id,
      miembros: { create: [{ usuarioId: jugador.id, rol: 'ADMIN' }, { usuarioId: otro.id }] },
    },
  });
  const dia = 86400_000;
  const ahora = Date.now();
  const a = new Date(ahora + 2 * dia);
  const b = new Date(ahora + 3 * dia);

  assert.deepEqual(await crearEncuesta(otro, grupo.id, [a]), { error: 'Proponé al menos 2 horarios distintos.' });
  assert.deepEqual(await crearEncuesta(otro, grupo.id, [a, a]), { error: 'Proponé al menos 2 horarios distintos.' });
  assert.ok('error' in (await crearEncuesta(dueno, grupo.id, [a, b])), 'los de afuera no proponen');
  assert.ok('error' in (await crearEncuesta(otro, grupo.id, [new Date(ahora - dia), b])), 'nada en el pasado');

  const creada = await crearEncuesta(otro, grupo.id, [b, a]);
  assert.ok('id' in creada);
  assert.ok('error' in (await crearEncuesta(jugador, grupo.id, [a, b])), 'una abierta por grupo');
  // Avisó al resto del grupo.
  assert.equal(await prisma.notificacion.count({ where: { usuarioId: jugador.id, tipo: 'ENCUESTA' } }), 1);

  const abierta = (await encuestaAbierta(grupo.id))!;
  assert.deepEqual(abierta.opciones.map((o) => o.fecha.getTime()), [a.getTime(), b.getTime()], 'ordenadas');
  const [primera, segunda] = abierta.opciones;
  assert.deepEqual((await encuestasSinMiVoto(jugador.id)).map((e) => e.id), [creada.id], 'en Inicio hasta que vota');
  assert.equal(await votar(jugador.id, creada.id, [primera.id, segunda.id]), null);
  assert.equal(await votar(jugador.id, creada.id, [segunda.id]), null, 'cambiar el voto reemplaza');
  assert.deepEqual(await encuestasSinMiVoto(jugador.id), [], 'ya votó');
  assert.equal(await votar(otro.id, creada.id, [segunda.id, 'cualquiera']), null);
  assert.equal(await votar(dueno.id, creada.id, [segunda.id]), 'Votan los del grupo.');
  const votos = await prisma.votoEncuesta.groupBy({ by: ['opcionId'], where: { opcion: { encuestaId: creada.id } }, _count: { _all: true } });
  assert.deepEqual(votos.map((v) => [v.opcionId, v._count._all]), [[segunda.id, 2]]);

  // Cierra quien la propuso o un admin; un miembro común que no la propuso, no.
  await prisma.miembroGrupo.create({ data: { grupoId: grupo.id, usuarioId: dueno.id } });
  assert.equal(await cerrarEncuesta(dueno.id, creada.id), 'La cierra quien la propuso o un admin.');
  assert.equal(await cerrarEncuesta(jugador.id, creada.id, null), null);
  assert.equal(await encuestaAbierta(grupo.id), null);
  assert.equal(await votar(jugador.id, creada.id, [primera.id]), 'La encuesta ya cerró.');
});

test('rótulo de la opción en hora argentina', () => {
  // Sábado 17 a las 22:00 en Argentina.
  assert.equal(rotuloOpcion(new Date('2026-10-18T01:00:00Z')), 'sáb 17 oct 22:00');
});
