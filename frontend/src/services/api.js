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
