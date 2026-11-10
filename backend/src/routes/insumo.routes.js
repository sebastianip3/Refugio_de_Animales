
import { Router } from "express";

import { listarInsumos, crearInsumo } from "../controllers/insumo.controller.js";
import { autenticar } from "../middleware/auth.middleware.js";

import { permitirCuenta } from "../middleware/rol.middleware.js";

const router = Router();

// Consultar inventario:
// Solo usuarios internos con sesión iniciada.
router.get(
  "/",
  autenticar,
  permitirCuenta(
    "ADMINISTRADOR",
    "TRABAJADOR",
    "VOLUNTARIO",
    "ENCARGADO_ADOPCIONES"
  ),
  listarInsumos
);

router.post(
  "/",
  autenticar,
  permitirCuenta("ADMINISTRADOR"),
  crearInsumo
);

export default router;
