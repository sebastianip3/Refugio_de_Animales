import { defineConfig } from 'vitest/config';

// Las pruebas no usan la base de datos real ni envían correos:
// Prisma y el envío de correos se reemplazan por versiones falsas (mocks) en cada prueba.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    // Variables propias de las pruebas (dotenv no las pisa con las de backend/.env)
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'secreto-solo-para-pruebas',
    },
    // Cada prueba parte con los mocks limpios
    clearMocks: true,
    restoreMocks: true,
  },
});
