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
  // Test 1: Filtro de mascotas adoptadas, en el refugio y todas
  it("el veterinario ve las mascotas adoptadas y puede filtrarlas", async () => {
    const user = await abrirPagina(VETERINARIO);

    // Comprueba que la información aparece en pantalla
    expect(screen.getByText("Michi")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Adoptadas (1)" }));
    // Comprueba que la información aparece en pantalla
    expect(screen.getByText("Michi")).toBeInTheDocument();
    // Comprueba que el elemento no aparece en pantalla
    expect(screen.queryByText("Canela")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "En el refugio (1)" }));
    // Comprueba que la información aparece en pantalla
    expect(screen.getByText("Canela")).toBeInTheDocument();
    // Comprueba que el elemento no aparece en pantalla
    expect(screen.queryByText("Michi")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Todas (2)" }));
    // Comprueba que la información aparece en pantalla
    expect(screen.getByText("Canela")).toBeInTheDocument();
    expect(screen.getByText("Michi")).toBeInTheDocument();
  });

  // Test 2: Ocultamiento de mascotas adoptadas y del filtro para el visitante
  it("el visitante no ve las mascotas adoptadas ni el filtro", async () => {
    await abrirPagina(null);

    // Comprueba que el elemento no aparece en pantalla
    expect(screen.queryByText("Michi")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Filtrar mascotas" })).not.toBeInTheDocument();
  });

  // Test 3: Búsqueda de mascotas por nombre o especie
  it("el buscador encuentra por nombre o especie", async () => {
    const user = await abrirPagina(VETERINARIO);

    await user.type(screen.getByRole("searchbox", { name: "Buscar mascota" }), "gato");

    // Comprueba que la información aparece en pantalla
    expect(screen.getByText("Michi")).toBeInTheDocument();
    // Comprueba que el elemento no aparece en pantalla
    expect(screen.queryByText("Canela")).not.toBeInTheDocument();
  });
});

describe("Formulario de registro clínico", () => {
  // Test 4: Historial de solo lectura para el visitante
  it("el visitante solo puede ver el historial, no agregar registros", async () => {
    const user = await abrirPagina(null);

    await user.click(screen.getByRole("button", { name: "Ver historial clínico" }));

    // Comprueba que la información aparece en pantalla
    expect(await screen.findByText(/no tiene antecedentes veterinarios registrados/)).toBeInTheDocument();
    // Comprueba que el elemento no aparece en pantalla
    expect(screen.queryByRole("button", { name: /Agregar registro/ })).not.toBeInTheDocument();
  });

  // Test 5: Lista de veterinarios obtenida de las cuentas del refugio
  it("la lista de veterinarios sale de las cuentas del refugio", async () => {
    const user = await abrirPagina(VETERINARIO);
    await abrirFormularioNuevoRegistro(user);

    const select = screen.getByLabelText("Veterinario responsable");
    // Comprueba que la información aparece en pantalla
    expect(screen.getByRole("option", { name: "Jorge Palacio" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Karla Muñoz" })).toBeInTheDocument();
    // Ya no aparecen los veterinarios de ejemplo
    expect(screen.queryByRole("option", { name: /James Herriot/ })).not.toBeInTheDocument();
    // El veterinario que inició sesión queda seleccionado por defecto
    expect(select).toHaveValue("8");
  });

  // Test 6: Verificación de bloqueo y mensajes de error al guardar vacío
  it("muestra los errores si se guarda sin completar los datos", async () => {
    const user = await abrirPagina(ADMINISTRADOR);
    await abrirFormularioNuevoRegistro(user);

    await user.click(screen.getByRole("button", { name: "Guardar registro" }));

    // Comprueba que el mensaje de error aparece en pantalla
    expect(await screen.findByText("Seleccione el veterinario responsable")).toBeInTheDocument();
    expect(screen.getByText("La descripción debe tener al menos 3 caracteres")).toBeInTheDocument();
    // Comprueba que el servicio no fue llamado (registrosClinicosApi.crear) debido al fallo de validación
    expect(registrosClinicosApi.crear).not.toHaveBeenCalled();
  });

  // Test 7: Límite de caracteres de los campos del registro clínico
  it("los campos de texto no dejan escribir más del máximo de caracteres", async () => {
    const user = await abrirPagina(VETERINARIO);
    await abrirFormularioNuevoRegistro(user);

    // Comprueba el límite de caracteres de cada campo (maxLength)
    expect(screen.getByLabelText("Descripción")).toHaveAttribute("maxLength", "200");
    expect(screen.getByLabelText(/Diagnóstico/)).toHaveAttribute("maxLength", "100");
    expect(screen.getByLabelText(/Tratamiento/)).toHaveAttribute("maxLength", "150");
    expect(screen.getByLabelText(/Observaciones adicionales/)).toHaveAttribute("maxLength", "200");
  });

  // Test 8: Registro clínico válido guardado con el veterinario como número
  it("guarda un registro válido con el veterinario como número", async () => {
    const user = await abrirPagina(VETERINARIO);
    await abrirFormularioNuevoRegistro(user);

    await user.selectOptions(screen.getByLabelText("Tipo de registro"), "VACUNA");
    await user.type(screen.getByLabelText("Descripción"), "Vacuna antirrábica");
    await user.selectOptions(screen.getByLabelText("Veterinario responsable"), "13");
    await user.click(screen.getByRole("button", { name: "Guardar registro" }));

    // Comprueba que la información aparece en pantalla
    expect(await screen.findByText("Registro clínico agregado.")).toBeInTheDocument();
    // Comprueba que se llamó al servicio (registrosClinicosApi.crear) con los datos esperados
    expect(registrosClinicosApi.crear).toHaveBeenCalledWith(
      canela.id,
      expect.objectContaining({ tipo: "VACUNA", descripcion: "Vacuna antirrábica", veterinarioId: 13 })
    );
  });

  // Test 9: Veterinario responsable visible en cada registro del historial
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

    // Comprueba que la información aparece en pantalla
    expect(await screen.findByText("Control general")).toBeInTheDocument();
    expect(screen.getByText(/Jorge Palacio/)).toBeInTheDocument();
    expect(screen.getByText(/Veterinario no indicado/)).toBeInTheDocument();
  });
});
