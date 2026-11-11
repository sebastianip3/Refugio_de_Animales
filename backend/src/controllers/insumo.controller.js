
import * as insumoService from "../services/insumo.service.js";
import { ZodError } from "zod";
import {
  crearInsumoSchema,
  movimientoInsumoSchema,
} from "../schema/insumo.schema.js";

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


export async function crearInsumo(req, res) {
  try {
    const datos = crearInsumoSchema.parse(req.body);

    const insumo = await insumoService.crearInsumo(
      datos,
      req.cuenta.id
    );

    return res.status(201).json(insumo);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Datos inválidos",
        errors: error.issues.map((issue) => ({
          campo: issue.path.join("."),
          mensaje: issue.message,
        })),
      });
    }

    console.error("Error al crear insumo:", error);

    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
}


export async function registrarMovimientoInsumo(req, res) {
  try {
    const insumoId = Number(req.params.id);

    if (!Number.isSafeInteger(insumoId) || insumoId <= 0) {
      return res.status(400).json({
        message: "ID de insumo inválido",
      });
    }

    const datos = movimientoInsumoSchema.parse(req.body);

    const resultado =
      await insumoService.registrarMovimientoInsumo(
        insumoId,
        datos,
        req.cuenta.id
      );

    return res.status(201).json(resultado);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Datos inválidos",
        errors: error.issues.map((issue) => ({
          campo: issue.path.join("."),
          mensaje: issue.message,
        })),
      });
    }

    if (error.status === 404 || error.status === 409) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    console.error("Error al registrar movimiento:", error);

    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
}
