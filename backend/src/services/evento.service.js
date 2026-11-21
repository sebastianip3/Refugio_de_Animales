
import prisma from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

// Listar todos los eventos para el administrador
export async function listarEventos() {
  return prisma.evento.findMany({
    orderBy: {
      fecha: "asc",
    },
  });
}

// Listar solamente eventos visibles para visitantes
export async function listarEventosPublicos() {
  return prisma.evento.findMany({
    where: {
      publicado: true,
      estado: "PROGRAMADO",
      fecha: {
        gt: new Date(),
      },
    },
    orderBy: {
      fecha: "asc",
    },
  });
}

// Buscar un evento por su ID
export async function obtenerEvento(id) {
  const evento = await prisma.evento.findUnique({
    where: { id },
  });

  if (!evento) {
    throw new AppError(404, "Evento no encontrado");
  }

  return evento;
}

// Crear un evento nuevo
export async function crearEvento(datos) {
  if (datos.fecha <= new Date()) {
    throw new AppError(
      400,
      "La fecha del evento debe ser futura"
    );
  }

  if (
    datos.publicado === true &&
    datos.estado &&
    datos.estado !== "PROGRAMADO"
  ) {
    throw new AppError(
      400,
      "Solo se pueden publicar eventos programados"
    );
  }

  return prisma.evento.create({
    data: datos,
  });
}

// Modificar un evento existente
export async function actualizarEvento(id, datos) {
  const eventoActual = await obtenerEvento(id);

  if (datos.fecha && datos.fecha <= new Date()) {
    throw new AppError(
      400,
      "La fecha del evento debe ser futura"
    );
  }

  const cambios = { ...datos };

  // Si se cancela o finaliza, dejar de mostrarlo al público
  if (
    cambios.estado &&
    cambios.estado !== "PROGRAMADO"
  ) {
    cambios.publicado = false;
  }

  const fechaFinal = cambios.fecha ?? eventoActual.fecha;
  const estadoFinal = cambios.estado ?? eventoActual.estado;
  const publicadoFinal =
    cambios.publicado ?? eventoActual.publicado;

  if (
    publicadoFinal &&
    (estadoFinal !== "PROGRAMADO" ||
      fechaFinal <= new Date())
  ) {
    throw new AppError(
      409,
      "Solo se pueden publicar eventos futuros y programados"
    );
  }

  return prisma.evento.update({
    where: { id },
    data: cambios,
  });
}

// Eliminar un evento
export async function eliminarEvento(id) {
  await obtenerEvento(id);

  return prisma.evento.delete({
    where: { id },
  });
}
