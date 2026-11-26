import { vi } from 'vitest';

// Prisma falso: cada método es una función simulada (vi.fn) a la que cada prueba
// le indica qué devolver. Así las pruebas no tocan la base de datos real.
function modelo() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  };
}

export function crearPrismaMock() {
  const prisma = {
    adopcion: modelo(),
    animal: modelo(),
    visitaAdopcion: modelo(),
    registroClinico: modelo(),
    cuenta: modelo(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
  // Una transacción ejecuta la función con el mismo Prisma falso
  prisma.$transaction = vi.fn((funcion) => funcion(prisma));
  return prisma;
}
