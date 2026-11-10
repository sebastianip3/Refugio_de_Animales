
import * as insumoService from "../services/insumo.service.js";

// GET /api/insumos
export async function listarInsumos(req, res) {
  try {
    const insumos = await insumoService.listarInsumos();

    return res.status(200).json(insumos);
  } catch (error) {
    console.error("Error al listar insumos:", error);

    return res.status(500).json({
      message: "Error al consultar los insumos",
    });
  }
}
