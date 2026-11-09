const BASE_URL = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const detalles = data?.errors?.map((e) => `${e.campo}: ${e.mensaje}`).join(", ");
    throw new Error(detalles || data?.message || data?.error || `Error ${res.status}`);
  }

  return data;
}

export const animalesApi = {
  listar: () => request("/animales"),
  obtener: (id) => request(`/animales/${id}`),
  historial: (id) => request(`/animales/${id}/historial`),
  crear: (animal) => request("/animales", { method: "POST", body: JSON.stringify(animal) }),
  actualizar: (id, animal) =>
    request(`/animales/${id}`, { method: "PATCH", body: JSON.stringify(animal) }),
  eliminar: (id) => request(`/animales/${id}`, { method: "DELETE" }),
};

export const especiesApi = {
  listar: () => request("/especies"),
};

export const adopcionesApi = {
  listar: () => request("/adopciones"),
  obtener: (id) => request(`/adopciones/${id}`),
  crear: (adopcion) => request("/adopciones", { method: "POST", body: JSON.stringify(adopcion) }),
  actualizar: (id, cambios) =>
    request(`/adopciones/${id}`, { method: "PATCH", body: JSON.stringify(cambios) }),
};

export const cuidadosApi = {
  listarVoluntariosDisponibles: () => request("/cuidados/voluntarios-disponibles"),
};

export const esterilizacionApi = {
// comunidad
  listarJornadasDisponibles: () => request("/esterilizacion/jornadas/disponibles"),
  crearInscripcion: (jornadaId, datos) =>
    request(`/esterilizacion/jornadas/${jornadaId}/inscripciones`, {method: "POST", body: JSON.stringify(datos),}),

// jornadas (admin) 
  listarJornadas: () => request("/esterilizacion/jornadas"),
  crearJornada: (jornada) => 
    request("/esterilizacion/jornadas", {method: "POST", body: JSON.stringify(jornada)}),
  actualizarJornada: (id, cambios)  =>
    request(`/esterilizacion/jornadas/${id}`, {method: "PATCH", body: JSON.stringify(cambios)}),
  abrirFormulario: (id) =>
    request(`/esterilizacion/jornadas/${id}/abrir`, {method: "PATCH"}),
  cerrarFormulario: (id) =>
    request(`/esterilizacion/jornadas/${id}/cerrar`, {method: "PATCH"}),
  eliminarJornada: (id) =>
    request(`/esterilizacion/jornadas/${id}`, {method: "DELETE"}),

// inscripciones (admin)
listarInscripciones: (jornadaId) =>
   request(`/esterilizacion/jornadas/${jornadaId}/inscripciones`),
ActualizarInscripcion: (id , cambios) =>
  request(`/esterilizacion/inscripciones/${id}`, {method: "PATCH", body: JSON.stringify(cambios)}),
obtenerInscripcion: (inscripcionId) =>
  request(`/esterilizacion/inscripciones/${inscripcionId}`),
reenviarComprobante: (id) =>
  request(`/esterilizacion/inscripciones/${id}/reenviar-comprobante`, {method: "POST"}),
};