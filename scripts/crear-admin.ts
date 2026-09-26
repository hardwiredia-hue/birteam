// Crea una cuenta con rol ADMIN. Las credenciales van por argumentos para
// que nunca queden escritas en el repositorio.
//
//   npx tsx scripts/crear-admin.ts <usuario> <email> '<contraseña>'
//
// En el servidor, antes hay que cargar las variables del ambiente:
//   set -a; . ./.env.production; set +a
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const [, , usuarioCrudo, emailCrudo, clave] = process.argv;

async function crear() {
  const usuario = usuarioCrudo?.toLowerCase();
  const email = emailCrudo?.toLowerCase();
  if (!usuario || !email || !clave) {
    console.error("Uso: npx tsx scripts/crear-admin.ts <usuario> <email> '<contraseña>'");
    process.exit(1);
  }
  if (clave.length < 8) {
    console.error('La contraseña necesita al menos 8 caracteres.');
    process.exit(1);
  }

  const existente = await prisma.usuario.findFirst({
    where: { OR: [{ usuario }, { email }] },
  });
  if (existente) {
    // Si la cuenta ya está, la dejamos como ADMIN y renovamos la clave.
    await prisma.usuario.update({
      where: { id: existente.id },
      data: { rol: 'ADMIN', hashClave: await bcrypt.hash(clave, 10) },
    });
    console.log(`La cuenta @${existente.usuario} ya existía: quedó como ADMIN con la contraseña nueva.`);
    return;
  }

  await prisma.usuario.create({
    data: {
      nombre: 'Admin birteam',
      usuario,
      email,
      hashClave: await bcrypt.hash(clave, 10),
      rol: 'ADMIN',
    },
  });
  console.log(`Listo: @${usuario} (${email}) creado con rol ADMIN.`);
}

crear()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
