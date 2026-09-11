import { PrismaClient } from '@prisma/client';
import { DEPORTES_INICIALES } from '../src/lib/constantes';
import { slugificar } from '../src/lib/normalizar';

const prisma = new PrismaClient();

async function sembrar() {
  for (const [indice, nombre] of DEPORTES_INICIALES.entries()) {
    await prisma.deporte.upsert({
      where: { slug: slugificar(nombre) },
      update: { nombre, orden: indice },
      create: { nombre, slug: slugificar(nombre), orden: indice },
    });
  }
  console.log(`Deportes sembrados: ${DEPORTES_INICIALES.length}`);
}

sembrar()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
