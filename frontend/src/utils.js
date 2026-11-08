// Roles que pueden ver y evaluar solicitudes de adopción (igual que en el backend)
const ROLES_EVALUAN_ADOPCIONES = ["ENCARGADO_ADOPCIONES", "ADMINISTRADOR"];

export const puedeEvaluarAdopciones = (cuenta) =>
  Boolean(cuenta && ROLES_EVALUAN_ADOPCIONES.includes(cuenta.tipo));
