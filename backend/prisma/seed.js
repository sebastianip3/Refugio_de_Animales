import prisma from '../src/config/prisma.js';

const especies = [
  { nombre: 'Perro', descripcion: 'Canis lupus familiaris' },
  { nombre: 'Gato', descripcion: 'Felis catus' },
];

async function main() {
  for (const especie of especies) {
    await prisma.especie.upsert({
      where: { nombre: especie.nombre },
      update: {},
      create: especie,
    });
  }
  console.log(`=> ${especies.length} especies cargadas`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
