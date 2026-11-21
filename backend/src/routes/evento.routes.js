
import { Router } from "express";

import {
  listarEventos,
  listarEventosPublicos,
  obtenerEvento,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
} from "../controllers/evento.controller.js";

import {
  autenticar,
  autorizar,
} from "../middleware/auth.middleware.js";

const router = Router();

// Solo administradores pueden gestionar eventos
const permisoAdministrador = [
  autenticar,
  autorizar("ADMINISTRADOR"),
];

// PÚBLICO: consultar eventos publicados
router.get("/publicos", listarEventosPublicos);

// ADMINISTRADOR: consultar todos los eventos
router.get("/", permisoAdministrador, listarEventos);

// ADMINISTRADOR: obtener un evento específico
router.get("/:id", permisoAdministrador, obtenerEvento);

// ADMINISTRADOR: crear un evento
router.post("/", permisoAdministrador, crearEvento);

// ADMINISTRADOR: modificar un evento
router.patch("/:id", permisoAdministrador, actualizarEvento);

// ADMINISTRADOR: eliminar un evento
router.delete("/:id", permisoAdministrador, eliminarEvento);

export default router;
