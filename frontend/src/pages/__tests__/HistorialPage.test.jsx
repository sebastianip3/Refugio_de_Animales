import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Las llamadas al backend se reemplazan por funciones falsas: la página se prueba sin servidor
vi.mock("../../services/api.js", () => ({
  animalesApi: {
    listar: vi.fn(),
    historial: vi.fn(),
  },
  cuentasApi: {
    listarVeterinarios: vi.fn(),
  },
  registrosClinicosApi: {
    crear: vi.fn(),
    actualizar: vi.fn(),
  },
}));

import { animalesApi, cuentasApi, registrosClinicosApi } from "../../services/api.js";
import HistorialPage from "../HistorialPage.jsx";

const VETERINARIO = { id: 8, nombre: "Jorge", apellido: "Palacio", tipo: "VETERINARIO" };
const ADMINISTRADOR = { id: 1, nombre: "Admin", apellido: "Refugio", tipo: "ADMINISTRADOR" };

const canela = { id: 1, nombre: "Canela", estado: "EN_ADOPCION", sexo: "HEMBRA", especie: { nombre: "Perro" } };
const michi = { id: 2, nombre: "Michi", estado: "ADOPTADO", sexo: "MACHO", especie: { nombre: "Gato" } };

const veterinarios = [
  { id: 8, nombre: "Jorge", apellido: "Palacio" },
  { id: 13, nombre: "Karla", apellido: "Muñoz" },
];

beforeEach(() => {
  animalesApi.listar.mockResolvedValue([canela, michi]);
  animalesApi.historial.mockResolvedValue({ ...canela, registrosClinicos: [] });
  cuentasApi.listarVeterinarios.mockResolvedValue(veterinarios);
  registrosClinicosApi.crear.mockResolvedValue({ id: 50 });
});

async function abrirPagina(cuenta) {
  const user = userEvent.setup();
  render(<HistorialPage cuenta={cuenta} />);
  await screen.findByText("Canela");
  return user;
}

// Abre el historial de Canela y el formulario de nuevo registro
async function abrirFormularioNuevoRegistro(user) {
  const [botonCanela] = screen.getAllByRole("button", { name: "Historial clínico" });
  await user.click(botonCanela);
  await user.click(await screen.findByRole("button", { name: /Agregar registro/ }));
  await screen.findByRole("heading", { name: "Nuevo registro clínico" });
}

describe("Filtro de mascotas adoptadas (vista del veterinario)", () => {
  it("el veterinario ve las mascotas adoptadas y puede filtrarlas", async () => {
    const user = await abrirPagina(VETERINARIO);

    expect(screen.getByText("Michi")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Adoptadas (1)" }));
    expect(screen.getByText("Michi")).toBeInTheDocument();
    expect(screen.queryByText("Canela")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "En el refugio (1)" }));
    expect(screen.getByText("Canela")).toBeInTheDocument();
    expect(screen.queryByText("Michi")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Todas (2)" }));
    expect(screen.getByText("Canela")).toBeInTheDocument();
    expect(screen.getByText("Michi")).toBeInTheDocument();
  });

  it("el visitante no ve las mascotas adoptadas ni el filtro", async () => {
    await abrirPagina(null);

    expect(screen.queryByText("Michi")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Filtrar mascotas" })).not.toBeInTheDocument();
  });

  it("el buscador encuentra por nombre o especie", async () => {
    const user = await abrirPagina(VETERINARIO);

    await user.type(screen.getByRole("searchbox", { name: "Buscar mascota" }), "gato");

    expect(screen.getByText("Michi")).toBeInTheDocument();
    expect(screen.queryByText("Canela")).not.toBeInTheDocument();
  });
});

describe("Formulario de registro clínico", () => {
  it("el visitante solo puede ver el historial, no agregar registros", async () => {
    const user = await abrirPagina(null);

    await user.click(screen.getByRole("button", { name: "Ver historial clínico" }));

    expect(await screen.findByText(/no tiene antecedentes veterinarios registrados/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Agregar registro/ })).not.toBeInTheDocument();
  });

  it("la lista de veterinarios sale de las cuentas del refugio", async () => {
    const user = await abrirPagina(VETERINARIO);
    await abrirFormularioNuevoRegistro(user);

    const select = screen.getByLabelText("Veterinario responsable");
    expect(screen.getByRole("option", { name: "Jorge Palacio" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Karla Muñoz" })).toBeInTheDocument();
    // Ya no aparecen los veterinarios de ejemplo
    expect(screen.queryByRole("option", { name: /James Herriot/ })).not.toBeInTheDocument();
    // El veterinario que inició sesión queda seleccionado por defecto
    expect(select).toHaveValue("8");
  });

  it("muestra los errores si se guarda sin completar los datos", async () => {
    const user = await abrirPagina(ADMINISTRADOR);
    await abrirFormularioNuevoRegistro(user);

    await user.click(screen.getByRole("button", { name: "Guardar registro" }));

    expect(await screen.findByText("Seleccione el veterinario responsable")).toBeInTheDocument();
    expect(screen.getByText("La descripción debe tener al menos 3 caracteres")).toBeInTheDocument();
    expect(registrosClinicosApi.crear).not.toHaveBeenCalled();
  });

  it("los campos de texto no dejan escribir más del máximo de caracteres", async () => {
    const user = await abrirPagina(VETERINARIO);
    await abrirFormularioNuevoRegistro(user);

    expect(screen.getByLabelText("Descripción")).toHaveAttribute("maxLength", "200");
    expect(screen.getByLabelText(/Diagnóstico/)).toHaveAttribute("maxLength", "100");
    expect(screen.getByLabelText(/Tratamiento/)).toHaveAttribute("maxLength", "150");
    expect(screen.getByLabelText(/Observaciones adicionales/)).toHaveAttribute("maxLength", "200");
  });

  it("guarda un registro válido con el veterinario como número", async () => {
    const user = await abrirPagina(VETERINARIO);
    await abrirFormularioNuevoRegistro(user);

    await user.selectOptions(screen.getByLabelText("Tipo de registro"), "VACUNA");
    await user.type(screen.getByLabelText("Descripción"), "Vacuna antirrábica");
    await user.selectOptions(screen.getByLabelText("Veterinario responsable"), "13");
    await user.click(screen.getByRole("button", { name: "Guardar registro" }));

    expect(await screen.findByText("Registro clínico agregado.")).toBeInTheDocument();
    expect(registrosClinicosApi.crear).toHaveBeenCalledWith(
      canela.id,
      expect.objectContaining({ tipo: "VACUNA", descripcion: "Vacuna antirrábica", veterinarioId: 13 })
    );
  });

  it("muestra el veterinario de cada registro del historial", async () => {
    animalesApi.historial.mockResolvedValue({
      ...canela,
      registrosClinicos: [
        {
          id: 7,
          fecha: "2026-11-01T00:00:00.000Z",
          tipo: "CONSULTA",
          descripcion: "Control general",
          veterinario: { id: 8, nombre: "Jorge", apellido: "Palacio" },
        },
        { id: 6, fecha: "2026-10-01T00:00:00.000Z", tipo: "OTRO", descripcion: "Registro antiguo", veterinario: null },
      ],
    });
    const user = await abrirPagina(null);

    await user.click(screen.getByRole("button", { name: "Ver historial clínico" }));

    expect(await screen.findByText("Control general")).toBeInTheDocument();
    expect(screen.getByText(/Jorge Palacio/)).toBeInTheDocument();
    expect(screen.getByText(/Veterinario no indicado/)).toBeInTheDocument();
  });
});
