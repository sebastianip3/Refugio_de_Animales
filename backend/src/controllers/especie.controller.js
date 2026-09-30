import * as especieService from '../services/especie.service.js';

// GET /especies
export async function listarEspecies(req, res) {
  try {
    const especies = await especieService.listarEspecies();
    res.json(especies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}
