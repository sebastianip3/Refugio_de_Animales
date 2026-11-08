const BASE_URL = "/api";

// Evento que App escucha para salir cuando la sesión vence o deja de ser válida
export const EVENTO_SESION_CERRADA = "sesion-cerrada";

// La sesión vive en una cookie httpOnly que pone el backend: el navegador la
// envía sola en cada petición y este código no la lee ni la guarda.
async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
  });

  // En el login un 401 es solo "contraseña incorrecta", no una sesión vencida
  if (res.status === 401 && path !== "/cuentas/login") {
    window.dispatchEvent(new Event(EVENTO_SESION_CERRADA));
  }

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

export const cuentasApi = {
  login: (credenciales) =>
    request("/cuentas/login", { method: "POST", body: JSON.stringify(credenciales) }),
  logout: () => request("/cuentas/logout", { method: "POST" }),
  perfil: () => request("/cuentas/perfil"),
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
