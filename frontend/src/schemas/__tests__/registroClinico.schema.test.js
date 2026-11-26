import { describe, it, expect } from "vitest";
import {
  registroClinicoFormSchema,
  nombreVeterinario,
  hoyComoTexto,
} from "../registroClinico.schema.js";

// Valores tal como los entrega el formulario (el select del veterinario entrega el id como texto)
const formularioValido = {
  fecha: "2026-11-01",
  tipo: "CONSULTA",
  descripcion: "Control general",
  diagnostico: "",
  tratamiento: "",
  veterinarioId: "8",
  observaciones: "",
};

const errores = (resultado) => resultado.error?.issues.map((issue) => issue.message) ?? [];

describe("Formulario de registro clínico", () => {
  it("acepta un registro válido y envía el veterinario como número", () => {
    const datos = registroClinicoFormSchema.parse(formularioValido);
    expect(datos.veterinarioId).toBe(8);
  });

  it("exige seleccionar el veterinario responsable", () => {
    expect(errores(registroClinicoFormSchema.safeParse({ ...formularioValido, veterinarioId: "" }))).toContain(
      "Seleccione el veterinario responsable"
    );
  });

  it("no acepta una fecha futura", () => {
    expect(errores(registroClinicoFormSchema.safeParse({ ...formularioValido, fecha: "2999-01-01" }))).toContain(
      "La fecha no puede ser futura"
    );
  });

  it("acepta la fecha de hoy", () => {
    expect(registroClinicoFormSchema.safeParse({ ...formularioValido, fecha: hoyComoTexto() }).success).toBe(true);
  });

  it("exige el tipo de registro", () => {
    expect(registroClinicoFormSchema.safeParse({ ...formularioValido, tipo: "" }).success).toBe(false);
  });

  it.each([
    ["descripcion", 200],
    ["diagnostico", 100],
    ["tratamiento", 150],
    ["observaciones", 200],
  ])("%s acepta hasta %i caracteres", (campo, maximo) => {
    expect(registroClinicoFormSchema.safeParse({ ...formularioValido, [campo]: "x".repeat(maximo) }).success).toBe(true);
    expect(registroClinicoFormSchema.safeParse({ ...formularioValido, [campo]: "x".repeat(maximo + 1) }).success).toBe(
      false
    );
  });
});

describe("Nombre del veterinario para mostrar", () => {
  it("muestra nombre y apellido", () => {
    expect(nombreVeterinario({ nombre: "Jorge", apellido: "Palacio" })).toBe("Jorge Palacio");
  });

  it("los registros sin veterinario muestran un texto de aviso", () => {
    expect(nombreVeterinario(null)).toBe("Veterinario no indicado");
  });
});
