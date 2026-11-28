import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import router from '../../src/routes/index.routes.js';

// La misma app que arma index.js, pero sin conectarse a la base de datos ni abrir un puerto
export function crearApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', router);
  return app;
}

// Cookie de sesión válida para una cuenta de prueba (el middleware la busca luego en Prisma)
export function cookieSesion(cuenta) {
  const token = jwt.sign({ sub: String(cuenta.id), tipo: cuenta.tipo }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
  });
  return `sesion=${token}`;
}

// Cuentas de prueba
export const ENCARGADO = { id: 5, nombre: 'Camila', apellido: 'Rojas', tipo: 'ENCARGADO_ADOPCIONES' };
export const VETERINARIO = { id: 8, nombre: 'Jorge', apellido: 'Palacio', tipo: 'VETERINARIO' };
export const VOLUNTARIO = { id: 20, nombre: 'Pedro', apellido: 'Soto', tipo: 'VOLUNTARIO' };
