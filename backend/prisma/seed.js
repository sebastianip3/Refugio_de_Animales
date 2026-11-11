import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma.js';

// Cuentas del personal para entrar en desarrollo.
// Cada contraseña se lee de backend/.env (variableContrasena) para no dejarla en el repositorio
const cuentasPersonal = [

  {
    variableContrasena: 'ADMIN_CONTRASENA',
    datos: {
      nombre: 'Administrador',
      apellido: 'Refugio',
      tipo: 'ADMINISTRADOR',
      correo: 'admin.local@refugio.test',
    },
  },
  {
    variableContrasena: 'TRABAJADOR_CONTRASENA',
    datos: {
      nombre: 'Trabajador',
      apellido: 'Refugio',
      tipo: 'TRABAJADOR',
      correo: 'trabajador.local@refugio.test',
    },
  },

  {
    variableContrasena: 'ENCARGADO_CONTRASENA',
    datos: {
      nombre: 'Encargado',
      apellido: 'Adopciones',
      tipo: 'ENCARGADO_ADOPCIONES',
      correo: 'encargado@refugio.cl',
    },
  },
  {
    variableContrasena: 'VETERINARIO_CONTRASENA',
    datos: {
      nombre: 'Veterinario',
      apellido: 'Refugio',
      tipo: 'VETERINARIO',
      correo: 'veterinario@refugio.cl',
    },
  },
];

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

  // Si la cuenta ya existe no se modifica, para no pisar una contraseña cambiada
  for (const { variableContrasena, datos } of cuentasPersonal) {
    const contrasena = process.env[variableContrasena];
    if (!contrasena) {
      console.log(`=> cuenta ${datos.correo} omitida: falta ${variableContrasena} en backend/.env`);
      continue;
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10);

    const actualizarContrasena =
      process.env.NODE_ENV !== 'production' &&
      process.env.RESETEAR_CLAVES_SEED === 'true';

    await prisma.cuenta.upsert({
      where: { correo: datos.correo },
      update: actualizarContrasena
        ? { contrasenaHash }
        : {},
      create: { ...datos, contrasenaHash },
    });

    console.log(`=> cuenta de ${datos.tipo}: ${datos.correo}`);
  }

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
