import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Las llamadas al backend se reemplazan por funciones falsas: la página se prueba sin servidor
vi.mock("../../services/api.js", () => ({
  adopcionesApi: {
    listar: vi.fn(),
    animalesEnProceso: vi.fn(),
    proximasVisitas: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    consultarSolicitudes: vi.fn(),
    listarVisitas: vi.fn(),
  },
  animalesApi: {
    listar: vi.fn(),
    historial: vi.fn(),
  },
}));

import { adopcionesApi, animalesApi } from "../../services/api.js";
import AdopcionesPage from "../AdopcionesPage.jsx";

const ENCARGADO = { id: 5, nombre: "Camila", apellido: "Rojas", tipo: "ENCARGADO_ADOPCIONES" };

// Solo Canela está disponible (ADOPTABLE). Michi ya tiene una solicitud en curso (EN_ADOPCION),
// Toby fue adoptado y Rocky está en tratamiento
const canela = { id: 1, nombre: "Canela", estado: "ADOPTABLE", sexo: "HEMBRA", especie: { nombre: "Perro" } };
const michi = { id: 2, nombre: "Michi", estado: "EN_ADOPCION", sexo: "MACHO", especie: { nombre: "Gato" } };
const toby = { id: 3, nombre: "Toby", estado: "ADOPTADO", sexo: "MACHO", especie: { nombre: "Perro" } };
const rocky = { id: 4, nombre: "Rocky", estado: "EN_TRATAMIENTO", sexo: "MACHO", especie: { nombre: "Perro" } };

// Campos del formulario de adopción (hay dos campos "RUT" en la página: el del formulario y el de la consulta)
const campo = {
  animal: () => screen.getByLabelText("Animal"),
  nombre: () => screen.getByLabelText("Nombre completo"),
  rut: () => screen.getByLabelText("RUT", { selector: "#rut" }),
  email: () => screen.getByLabelText("Correo electrónico", { selector: "#email" }),
  telefono: () => screen.getByLabelText("Teléfono"),
  direccion: () => screen.getByLabelText("Dirección"),
  comuna: () => screen.getByLabelText("Comuna"),
};

beforeEach(() => {
  animalesApi.listar.mockResolvedValue([canela, michi, toby, rocky]);
  // Michi ya tiene una adopción en proceso
  adopcionesApi.animalesEnProceso.mockResolvedValue([michi.id]);
  adopcionesApi.listar.mockResolvedValue([]);
  adopcionesApi.proximasVisitas.mockResolvedValue([]);
});

// Monta la página como un visitante (sin sesión) y espera a que carguen los animales
async function abrirComoVisitante() {
  const user = userEvent.setup();
  render(<AdopcionesPage cuenta={null} />);
  await screen.findByRole("option", { name: /Canela/ });
  return user;
}

describe("Formulario de adopción (vista del usuario)", () => {
  it("muestra los errores de validación si se envía vacío y no llama al backend", async () => {
    const user = await abrirComoVisitante();

    await user.click(screen.getByRole("button", { name: /Enviar solicitud/i }));

    expect(await screen.findByText("Debe seleccionar un animal")).toBeInTheDocument();
    expect(screen.getByText("El nombre debe tener al menos 3 caracteres")).toBeInTheDocument();
    expect(screen.getByText("Debe seleccionar una comuna")).toBeInTheDocument();
    expect(adopcionesApi.crear).not.toHaveBeenCalled();
  });

  it("solo ofrece los animales ADOPTABLES", async () => {
    await abrirComoVisitante();

    expect(screen.getByRole("option", { name: /Canela/ })).toBeEnabled();
    // En adopción (solicitud en curso), adoptado y en tratamiento no se pueden elegir
    expect(screen.queryByRole("option", { name: /Michi/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Toby/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Rocky/ })).not.toBeInTheDocument();
  });

  it("pone los puntos y el guion del RUT mientras se escribe", async () => {
    const user = await abrirComoVisitante();

    await user.type(campo.rut(), "123456785");

    expect(campo.rut()).toHaveValue("12.345.678-5");
  });

  it("el teléfono siempre empieza con 9 y se agrupa como 9 1234 5678", async () => {
    const user = await abrirComoVisitante();

    await user.type(campo.telefono(), "+56912345678");

    expect(campo.telefono()).toHaveValue("9 1234 5678");
  });

  it("avisa si el apóstrofo del nombre no está entre dos letras", async () => {
    const user = await abrirComoVisitante();

    await user.type(campo.nombre(), "Ana 'Soto");

    expect(
      await screen.findByText("El apóstrofo (') debe ir entre dos letras, por ejemplo O'Higgins")
    ).toBeInTheDocument();
  });

  it("los campos de texto no dejan escribir más del máximo de caracteres", async () => {
    await abrirComoVisitante();

    expect(campo.nombre()).toHaveAttribute("maxLength", "57");
    expect(campo.direccion()).toHaveAttribute("maxLength", "100");
    expect(screen.getByLabelText(/Otras mascotas/)).toHaveAttribute("maxLength", "200");
    expect(screen.getByLabelText(/Motivo de la adopción/)).toHaveAttribute("maxLength", "300");
  });

  it("envía una solicitud válida con los datos normalizados y muestra la confirmación", async () => {
    adopcionesApi.crear.mockResolvedValue({ id: 30, email: "ana@correo.cl", correoEnviado: true });
    const user = await abrirComoVisitante();

    await user.selectOptions(campo.animal(), String(canela.id));
    await user.type(campo.nombre(), "Ana O'Higgins");
    await user.type(campo.rut(), "123456785");
    await user.type(campo.email(), "ana@correo.cl");
    await user.type(campo.telefono(), "912345678");
    await user.type(campo.direccion(), "Los Aromos 123");
    await user.selectOptions(campo.comuna(), "CONCEPCION");
    await user.click(screen.getByRole("button", { name: /Enviar solicitud/i }));

    expect(
      await screen.findByText("Solicitud de adopción registrada. Te enviamos un correo de confirmación a ana@correo.cl.")
    ).toBeInTheDocument();
    expect(adopcionesApi.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        animalId: 1,
        nombre: "Ana O'Higgins",
        rut: "12345678-5",
        telefono: "+56912345678",
        comuna: "CONCEPCION",
      })
    );
  });
});

describe("Consulta del estado de la solicitud (vista del usuario)", () => {
  it("muestra el estado de la solicitud del adoptante", async () => {
    adopcionesApi.consultarSolicitudes.mockResolvedValue([
      {
        fechaSolicitud: "2026-11-20T12:00:00.000Z",
        estado: "EN_REVISION",
        animal: { nombre: "Canela", especie: { nombre: "Perro" } },
        motivoRechazo: null,
        proximaVisita: null,
      },
    ]);
    const user = await abrirComoVisitante();

    await user.type(screen.getByLabelText("RUT", { selector: "#consultaRut" }), "123456785");
    await user.type(screen.getByLabelText("Correo electrónico", { selector: "#consultaEmail" }), "ana@correo.cl");
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(await screen.findByText("Nuestro equipo está revisando tu solicitud.")).toBeInTheDocument();
    expect(adopcionesApi.consultarSolicitudes).toHaveBeenCalledWith("12345678-5", "ana@correo.cl");
  });

  it("avisa si no hay solicitudes con ese RUT y correo", async () => {
    adopcionesApi.consultarSolicitudes.mockResolvedValue([]);
    const user = await abrirComoVisitante();

    await user.type(screen.getByLabelText("RUT", { selector: "#consultaRut" }), "123456785");
    await user.type(screen.getByLabelText("Correo electrónico", { selector: "#consultaEmail" }), "ana@correo.cl");
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(await screen.findByText(/No encontramos solicitudes con ese RUT y correo/)).toBeInTheDocument();
  });
});

describe("Solicitudes (vista del encargado de adopciones)", () => {
  const solicitud = {
    id: 30,
    nombre: "Ana Soto",
    rut: "12345678-5",
    email: "ana@correo.cl",
    telefono: "+56912345678",
    comuna: "CONCEPCION",
    estado: "PENDIENTE",
    fechaSolicitud: "2026-11-20T12:00:00.000Z",
    observaciones: null,
    animal: { ...canela, estado: "EN_TRATAMIENTO" },
  };

  async function abrirComoEncargado() {
    adopcionesApi.listar.mockResolvedValue([solicitud]);
    const user = userEvent.setup();
    render(<AdopcionesPage cuenta={ENCARGADO} />);
    await screen.findByRole("heading", { name: "Solicitudes" });
    return user;
  }

  it("el usuario sin sesión no ve la tabla de solicitudes", async () => {
    await abrirComoVisitante();
    expect(screen.queryByRole("heading", { name: "Solicitudes" })).not.toBeInTheDocument();
    expect(adopcionesApi.listar).not.toHaveBeenCalled();
  });

  it("al presionar el animal se abre su registro clínico con su estado", async () => {
    animalesApi.historial.mockResolvedValue({
      registrosClinicos: [
        {
          id: 1,
          fecha: "2026-11-01T00:00:00.000Z",
          tipo: "VACUNA",
          descripcion: "Vacuna óctuple",
          veterinario: { nombre: "Jorge", apellido: "Palacio" },
        },
      ],
    });
    const user = await abrirComoEncargado();

    await user.click(await screen.findByRole("button", { name: /Ver registro clínico/ }));

    const ventana = await screen.findByRole("dialog");
    expect(await within(ventana).findByText("Vacuna óctuple")).toBeInTheDocument();
    expect(within(ventana).getByText("en tratamiento")).toBeInTheDocument();
    expect(within(ventana).getByText(/Jorge Palacio/)).toBeInTheDocument();
    expect(animalesApi.historial).toHaveBeenCalledWith(canela.id);
  });

  it("no deja rechazar una solicitud sin escribir el motivo", async () => {
    const user = await abrirComoEncargado();

    await user.click(await screen.findByRole("button", { name: "Evaluar" }));
    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(await screen.findByText("Debe escribir el motivo del rechazo")).toBeInTheDocument();
    expect(adopcionesApi.actualizar).not.toHaveBeenCalled();
  });

  it("el motivo del rechazo debe tener al menos 4 caracteres", async () => {
    const user = await abrirComoEncargado();

    await user.click(await screen.findByRole("button", { name: "Evaluar" }));
    await user.type(screen.getByLabelText("Observaciones de la evaluación"), "abc");
    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(await screen.findByText("El motivo del rechazo debe tener al menos 4 caracteres")).toBeInTheDocument();
    expect(adopcionesApi.actualizar).not.toHaveBeenCalled();
  });
});
