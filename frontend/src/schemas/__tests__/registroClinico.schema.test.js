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
  // Test 1: Validación de un registro completo y envío del veterinario como número
  it("acepta un registro válido y envía el veterinario como número", () => {
    const datos = registroClinicoFormSchema.parse(formularioValido);
    // Comprueba que el veterinario se envía como número
    expect(datos.veterinarioId).toBe(8);
  });

  // Test 2: Obligatoriedad del veterinario responsable
  it("exige seleccionar el veterinario responsable", () => {
    // Comprueba que se entrega el mensaje de error esperado
    expect(errores(registroClinicoFormSchema.safeParse({ ...formularioValido, veterinarioId: "" }))).toContain(
      "Seleccione el veterinario responsable"
    );
  });

  // Test 3: Rechazo de un registro con fecha futura
  it("no acepta una fecha futura", () => {
    // Comprueba que se entrega el mensaje de error esperado
    expect(errores(registroClinicoFormSchema.safeParse({ ...formularioValido, fecha: "2999-01-01" }))).toContain(
      "La fecha no puede ser futura"
    );
  });

  // Test 4: Aceptación de la fecha de hoy
  it("acepta la fecha de hoy", () => {
    // Comprueba que la validación acepta los datos
    expect(registroClinicoFormSchema.safeParse({ ...formularioValido, fecha: hoyComoTexto() }).success).toBe(true);
  });

  // Test 5: Obligatoriedad del tipo de registro
  it("exige el tipo de registro", () => {
    // Comprueba que la validación rechaza los datos
    expect(registroClinicoFormSchema.safeParse({ ...formularioValido, tipo: "" }).success).toBe(false);
  });

  // Test 6: Validación del máximo de caracteres de cada campo
  it.each([
    ["descripcion", 200],
    ["diagnostico", 100],
    ["tratamiento", 150],
    ["observaciones", 200],
  ])("%s acepta hasta %i caracteres", (campo, maximo) => {
    // Comprueba que la validación acepta los datos
    expect(registroClinicoFormSchema.safeParse({ ...formularioValido, [campo]: "x".repeat(maximo) }).success).toBe(true);
    // Comprueba que la validación rechaza un carácter más del máximo
    expect(registroClinicoFormSchema.safeParse({ ...formularioValido, [campo]: "x".repeat(maximo + 1) }).success).toBe(
      false
    );
  });
});

describe("Nombre del veterinario para mostrar", () => {
  // Test 7: Nombre del veterinario con nombre y apellido
  it("muestra nombre y apellido", () => {
    // Comprueba que se muestran el nombre y el apellido
    expect(nombreVeterinario({ nombre: "Jorge", apellido: "Palacio" })).toBe("Jorge Palacio");
  });

  // Test 8: Texto de aviso para registros sin veterinario
  it("los registros sin veterinario muestran un texto de aviso", () => {
    // Comprueba que se muestra el texto de aviso
    expect(nombreVeterinario(null)).toBe("Veterinario no indicado");
  });
});
