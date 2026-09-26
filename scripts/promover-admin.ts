// Promueve una cuenta existente a ADMIN. Se corre en el servidor (o local):
//
//   npx tsx scripts/promover-admin.ts <usuario>
//
// En el servidor, antes hay que cargar las variables del ambiente:
//   set -a; . ./.env.production; set +a
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const usuario = process.argv[2]?.toLowerCase();

async function promover() {
  if (!usuario) {
    console.error('Uso: npx tsx scripts/promover-admin.ts <usuario>');
    process.exit(1);
  }
  const cuenta = await prisma.usuario.findUnique({ where: { usuario } });
  if (!cuenta) {
    console.error(`No existe la cuenta @${usuario}. Registrala primero en el sitio.`);
    process.exit(1);
  }
  if (cuenta.rol === 'ADMIN') {
    console.log(`@${usuario} ya es ADMIN. Nada que hacer.`);
    return;
  }
  await prisma.usuario.update({ where: { usuario }, data: { rol: 'ADMIN' } });
  console.log(`Listo: @${usuario} ahora es ADMIN.`);
}

promover()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
