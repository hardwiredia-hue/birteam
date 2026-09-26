import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizar } from '@/lib/normalizar';

/**
 * Autocompletado de ciudades: /api/ubicaciones?q=mar%20del
 * Busca por nombre normalizado (sin tildes) y devuelve la ciudad con su
 * provincia, país y coordenadas para completar todos los campos de un saque.
 */
export async function GET(request: Request) {
  const parametros = new URL(request.url).searchParams;

  // Cascada: lista de provincias, o las ciudades de una provincia.
  if (parametros.get('listar') === 'provincias') {
    const provincias = await prisma.provincia.findMany({
      where: { paisCodigo: 'AR' },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true },
    });
    return NextResponse.json({ provincias });
  }
  const provinciaId = parametros.get('provinciaId');
  if (provinciaId) {
    const ciudades = await prisma.ciudad.findMany({
      where: { provinciaId },
      orderBy: { nombreNorm: 'asc' },
      include: { provincia: { include: { pais: true } } },
    });
    return NextResponse.json({
      ciudades: ciudades.map((ciudad) => ({
        id: ciudad.id,
        ciudad: ciudad.nombre,
        provincia: ciudad.provincia.nombre,
        pais: ciudad.provincia.pais.codigo,
        latitud: ciudad.latitud,
        longitud: ciudad.longitud,
      })),
    });
  }

  const q = parametros.get('q') ?? '';
  const buscado = normalizar(q);
  if (buscado.length < 2) return NextResponse.json({ resultados: [] });

  // Primero las que empiezan igual; si sobran lugares, las que lo contienen.
  const empiezan = await prisma.ciudad.findMany({
    where: { nombreNorm: { startsWith: buscado } },
    include: { provincia: { include: { pais: true } } },
    orderBy: { nombreNorm: 'asc' },
    take: 8,
  });
  const contienen =
    empiezan.length < 8
      ? await prisma.ciudad.findMany({
          where: {
            nombreNorm: { contains: buscado, not: { startsWith: buscado } },
          },
          include: { provincia: { include: { pais: true } } },
          orderBy: { nombreNorm: 'asc' },
          take: 8 - empiezan.length,
        })
      : [];

  return NextResponse.json({
    resultados: [...empiezan, ...contienen].map((ciudad) => ({
      id: ciudad.id,
      ciudad: ciudad.nombre,
      provincia: ciudad.provincia.nombre,
      pais: ciudad.provincia.pais.codigo,
      latitud: ciudad.latitud,
      longitud: ciudad.longitud,
    })),
  });
}
