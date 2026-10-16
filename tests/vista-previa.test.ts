import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { metadatosDe, vistaPartido } from '../src/lib/vista-previa';
import { escenario } from './ayuda';

after(() => prisma.$disconnect());

test('vista previa de un partido: lo que se ve al compartir el link', async () => {
  const sufijo = `vp${Date.now()}`;
  const { deporte, jugador, otro } = await escenario(sufijo);
  const partido = await prisma.partido.create({
    data: {
      deporteId: deporte.id,
      organizadorId: jugador.id,
      fecha: new Date(Date.now() + 2 * 86400_000),
      lugarNombre: 'Club Norte',
      ciudad: 'Rosario',
      cupo: 10,
      costoPorJugador: 4000,
      tokenPublico: `tok${sufijo}`,
      participaciones: { create: [{ usuarioId: jugador.id, estado: 'VOY' }, { usuarioId: otro.id, estado: 'VOY' }] },
    },
  });

  const vista = await vistaPartido(`tok${sufijo}`);
  assert.ok(vista);
  assert.equal(vista.destacado, 'Faltan 8');
  assert.equal(vista.detalle, 'Club Norte, Rosario');
  assert.match(vista.descripcion, /^En Club Norte, Rosario\. Organiza /);

  await prisma.partido.update({ where: { id: partido.id }, data: { listaCerrada: true } });
  assert.equal((await vistaPartido(`tok${sufijo}`))?.destacado, 'Lista cerrada');

  // Cancelado o link que no existe: sin datos, título genérico.
  await prisma.partido.update({ where: { id: partido.id }, data: { estado: 'CANCELADO' } });
  assert.equal(await vistaPartido(`tok${sufijo}`), null);
  assert.equal(await vistaPartido('no-existe'), null);
  assert.deepEqual(metadatosDe(null, 'Te invitaron a jugar'), { title: 'Te invitaron a jugar' });
});
