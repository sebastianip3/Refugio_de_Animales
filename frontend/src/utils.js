// Roles que pueden ver y evaluar solicitudes de adopción (igual que en el backend)
const ROLES_EVALUAN_ADOPCIONES = ["ENCARGADO_ADOPCIONES", "ADMINISTRADOR"];

export const puedeEvaluarAdopciones = (cuenta) =>
  Boolean(cuenta && ROLES_EVALUAN_ADOPCIONES.includes(cuenta.tipo));

// Roles que pueden registrar y actualizar el historial clínico (igual que en el backend)
const ROLES_EDITAN_HISTORIAL = ["VETERINARIO", "ADMINISTRADOR"];

export const puedeEditarHistorial = (cuenta) =>
  Boolean(cuenta && ROLES_EDITAN_HISTORIAL.includes(cuenta.tipo));

// Roles que pueden registrar, editar y eliminar animales 
const ROLES_REGISTRAN_ANIMALES = ["ADMINISTRADOR", "TRABAJADOR", "VOLUNTARIO"];
const ROLES_EDITAN_ANIMALES = [...ROLES_REGISTRAN_ANIMALES, "ENCARGADO_ADOPCIONES"];

export const puedeRegistrarAnimales = (cuenta) =>
  Boolean(cuenta && ROLES_REGISTRAN_ANIMALES.includes(cuenta.tipo));

export const puedeEditarAnimales = (cuenta) =>
  Boolean(cuenta && ROLES_EDITAN_ANIMALES.includes(cuenta.tipo));

export const puedeEliminarAnimales = (cuenta) => cuenta?.tipo === "ADMINISTRADOR";

// Color de la etiqueta del estado de cada animal (enum EstadoAnimal del backend).
// Se usa en el historial clínico y en las solicitudes de adopción
export const ESTILO_ESTADO_ANIMAL = {
  EN_EVALUACION: "bg-sky-50 text-sky-700 ring-sky-200",
  CUARENTENA: "bg-amber-50 text-amber-700 ring-amber-200",
  EN_TRATAMIENTO: "bg-rose-50 text-rose-700 ring-rose-200",
  EN_ADOPCION: "bg-violet-50 text-violet-700 ring-violet-200",
  ADOPTADO: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ADOPTABLE: "bg-sky-50 text-sky-700 ring-sky-200",
  NO_ADOPTABLE: "bg-rose-50 text-rose-700 ring-rose-200",
  FALLECIDO: "bg-slate-100 text-slate-600 ring-slate-200",
  EXTRAVIADO: "bg-purple-50 text-purple-700 ring-purple-200",
};
