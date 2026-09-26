import type { PrismaClient } from '@prisma/client';
import { normalizar } from './normalizar';
import datos from '../../prisma/data/argentina.json';

/**
 * Siembra Argentina completa: país, 24 provincias con código ISO y ~1.060
 * ciudades con coordenadas (prisma/data/argentina.json, dataset depurado).
 *
 * Idempotente: corre mil veces y solo agrega lo que falta, sin pisar
 * correcciones manuales hechas después. Devuelve cuántas ciudades agregó.
 */
export async function sembrarArgentina(prisma: PrismaClient) {
  await prisma.pais.upsert({
    where: { codigo: datos.pais.codigo },
    update: { nombre: datos.pais.nombre },
    create: { codigo: datos.pais.codigo, nombre: datos.pais.nombre },
  });

  let nuevas = 0;
  for (const prov of datos.provincias) {
    const provincia = await prisma.provincia.upsert({
      where: { paisCodigo_nombre: { paisCodigo: datos.pais.codigo, nombre: prov.nombre } },
      update: { codigo: prov.codigo, latitud: prov.latitud, longitud: prov.longitud },
      create: {
        nombre: prov.nombre,
        codigo: prov.codigo,
        paisCodigo: datos.pais.codigo,
        latitud: prov.latitud,
        longitud: prov.longitud,
      },
    });

    const existentes = new Set(
      (
        await prisma.ciudad.findMany({
          where: { provinciaId: provincia.id },
          select: { nombre: true },
        })
      ).map((ciudad) => ciudad.nombre)
    );
    const faltantes = prov.ciudades.filter((ciudad) => !existentes.has(ciudad.nombre));
    if (faltantes.length > 0) {
      await prisma.ciudad.createMany({
        data: faltantes.map((ciudad) => ({
          nombre: ciudad.nombre,
          nombreNorm: normalizar(ciudad.nombre),
          provinciaId: provincia.id,
          latitud: ciudad.latitud,
          longitud: ciudad.longitud,
        })),
      });
      nuevas += faltantes.length;
    }
  }
  return nuevas;
}
