
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

import * as eventoService from "../services/evento.service.js";

import {
  crearEventoSchema,
  actualizarEventoSchema,
} from "../schema/evento.schema.js";

import { AppError } from "../utils/app-error.js";

// Comprobar que el ID sea válido
function obtenerId(valor) {
  const id = Number(valor);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError(400, "ID de evento inválido");
  }

  return id;
}

// Manejar errores del controller
function manejarError(res, error) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Datos inválidos",
      errors: error.issues.map((issue) => ({
        campo: issue.path.join("."),
        mensaje: issue.message,
      })),
    });
  }

  if (error instanceof AppError) {
    return res.status(error.status).json({
      message: error.message,
    });
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return res.status(404).json({
      message: "Evento no encontrado",
    });
  }

  console.error("Error en eventos:", error);

  return res.status(500).json({
    message: "Error interno del servidor",
  });
}

// GET - Listar todos los eventos (administrador)
export async function listarEventos(req, res) {
  try {
    const eventos = await eventoService.listarEventos();

    return res.status(200).json(eventos);
  } catch (error) {
    return manejarError(res, error);
  }
}

// GET - Listar eventos públicos
export async function listarEventosPublicos(req, res) {
  try {
    const eventos =
      await eventoService.listarEventosPublicos();

    return res.status(200).json(eventos);
  } catch (error) {
    return manejarError(res, error);
  }
}

// GET - Buscar un evento por ID
export async function obtenerEvento(req, res) {
  try {
    const id = obtenerId(req.params.id);

    const evento = await eventoService.obtenerEvento(id);

    return res.status(200).json(evento);
  } catch (error) {
    return manejarError(res, error);
  }
}

// POST - Crear un evento
export async function crearEvento(req, res) {
  try {
    const datos = crearEventoSchema.parse(req.body);

    const evento = await eventoService.crearEvento(datos);

    return res.status(201).json(evento);
  } catch (error) {
    return manejarError(res, error);
  }
}

// PATCH - Modificar un evento
export async function actualizarEvento(req, res) {
  try {
    const id = obtenerId(req.params.id);

    const datos = actualizarEventoSchema.parse(req.body);

    const evento = await eventoService.actualizarEvento(
      id,
      datos
    );

    return res.status(200).json(evento);
  } catch (error) {
    return manejarError(res, error);
  }
}

// DELETE - Eliminar un evento
export async function eliminarEvento(req, res) {
  try {
    const id = obtenerId(req.params.id);

    await eventoService.eliminarEvento(id);

    return res.status(204).end();
  } catch (error) {
    return manejarError(res, error);
  }
}
