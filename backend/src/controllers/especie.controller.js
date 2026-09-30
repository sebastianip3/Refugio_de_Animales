import prisma from '../config/prisma.js';

// GET /especies
export async function listarEspecies(req, res) {
  try {
    const especies = await prisma.especie.findMany({ orderBy: { nombre: 'asc' } });
    res.json(especies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}
