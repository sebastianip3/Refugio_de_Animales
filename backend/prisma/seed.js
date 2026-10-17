import prisma from '../src/config/prisma.js';

const especies = [
  { nombre: 'Perro', descripcion: 'Canis lupus familiaris' },
  { nombre: 'Gato', descripcion: 'Felis catus' },
];

// Animales de ejemplo con antecedentes veterinarios para el historial clínico
const animalesDemo = [
  {
    nombre: 'Canela',
    especie: 'Perro',
    sexo: 'HEMBRA',
    edadEstimada: 24,
    peso: 14.5,
    estado: 'EN_ADOPCION',
    registrosClinicos: [
      {
        fecha: new Date('2026-06-02'),
        tipo: 'CONSULTA',
        descripcion: 'Evaluación de ingreso',
        diagnostico: 'Buen estado general, leve deshidratación',
        tratamiento: 'Hidratación oral',
        veterinario: 'Dra. Paula Rojas',
      },
      {
        fecha: new Date('2026-06-10'),
        tipo: 'VACUNA',
        descripcion: 'Vacuna óctuple',
        veterinario: 'Dra. Paula Rojas',
      },
      {
        fecha: new Date('2026-07-01'),
        tipo: 'ESTERILIZACION',
        descripcion: 'Ovariohisterectomía sin complicaciones',
        tratamiento: 'Analgésico por 5 días',
        veterinario: 'Dr. Andrés Soto',
      },
    ],
  },
  {
    nombre: 'Michi',
    especie: 'Gato',
    sexo: 'MACHO',
    edadEstimada: 8,
    peso: 3.2,
    estado: 'EN_ADOPCION',
    registrosClinicos: [
      {
        fecha: new Date('2026-08-15'),
        tipo: 'DESPARASITACION',
        descripcion: 'Desparasitación interna y externa',
        veterinario: 'Dr. Andrés Soto',
      },
      {
        fecha: new Date('2026-08-20'),
        tipo: 'EXAMEN',
        descripcion: 'Test de leucemia e inmunodeficiencia felina',
        diagnostico: 'Negativo',
        veterinario: 'Dr. Andrés Soto',
      },
    ],
  },
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

  // Solo se cargan una vez, para no duplicar animales al volver a ejecutar el seed
  if ((await prisma.registroClinico.count()) > 0) return;

  for (const { especie, registrosClinicos, ...animal } of animalesDemo) {
    await prisma.animal.create({
      data: {
        ...animal,
        especie: { connect: { nombre: especie } },
        registrosClinicos: { create: registrosClinicos },
      },
    });
  }
  console.log(`=> ${animalesDemo.length} animales con historial clínico cargados`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
