import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
console.log('avisos seguidor a fer:', await p.notificacion.count({ where: { usuarioId: 'cmuhyhlpo00037dxzfbkfa3j3', tipo: 'NUEVO_SEGUIDOR', creadoEn: { gte: new Date(Date.now() - 120000) } } }));
console.log('sigue:', await p.seguimiento.count({ where: { seguidorId: 'cmuhyhlsq00067dxzrxlzh4as', seguidoId: 'cmuhyhlpo00037dxzfbkfa3j3' } }));
await p.$disconnect();
