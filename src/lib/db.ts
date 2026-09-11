import { PrismaClient } from '@prisma/client';

// Singleton para que el recargado en desarrollo no abra mil conexiones.
const globalConPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalConPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalConPrisma.prisma = prisma;
