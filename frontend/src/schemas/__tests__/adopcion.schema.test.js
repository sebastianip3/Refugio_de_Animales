import { describe, it, expect } from "vitest";
import {
  adopcionFormSchema,
  consultaSolicitudSchema,
  formatearRut,
  formatearTelefono,
} from "../adopcion.schema.js";

// Valores tal como los entrega el formulario (todo es texto)
const formularioValido = {
  animalId: "1",
  nombre: "María José Núñez",
  rut: "12.345.678-5",
  email: "maria@correo.cl",
  telefono: "9 1234 5678",
  direccion: "Los Aromos 123",
  comuna: "CONCEPCION",
  tipoVivienda: "",
  otrasMascotas: "",
  motivo: "",
};

const errores = (resultado) => resultado.error?.issues.map((issue) => issue.message) ?? [];

describe("Formato automático del RUT mientras se escribe", () => {
  // Test 1: Formato automático del RUT mientras se escribe
  it.each([
    ["1", "1"],
    ["12", "1-2"],
    ["1234", "123-4"],
    ["12345678", "1.234.567-8"],
    ["123456785", "12.345.678-5"],
    ["7654333k", "7.654.333-K"],
  ])('"%s" se muestra como "%s"', (escrito, mostrado) => {
    // Comprueba el texto con formato que se muestra
    expect(formatearRut(escrito)).toBe(mostrado);
  });

  // Test 2: Ordenamiento de un RUT pegado con o sin formato
  it("ordena un RUT pegado con o sin formato", () => {
    // Comprueba el texto con formato que se muestra
    expect(formatearRut("12.345.678-5")).toBe("12.345.678-5");
    expect(formatearRut("12.345.6785")).toBe("12.345.678-5");
  });

  // Test 3: Descarte de letras inválidas y de la K que no va al final
  it("ignora letras que no sean K y la K que no va al final", () => {
    // Comprueba el texto con formato que se muestra
    expect(formatearRut("12a3")).toBe("12-3");
    expect(formatearRut("k12")).toBe("1-2");
  });

  // Test 4: Límite de 9 caracteres en el RUT (8 dígitos + verificador)
  it("no deja escribir más de 9 caracteres (8 dígitos + verificador)", () => {
    // Comprueba el texto con formato que se muestra
    expect(formatearRut("1234567855")).toBe("12.345.678-5");
  });
});

describe("Formato automático del teléfono mientras se escribe", () => {
  // Test 5: Formato automático del teléfono mientras se escribe
  it.each([
    ["9", "9"],
    ["91234", "9 1234"],
    ["912345678", "9 1234 5678"],
  ])('"%s" se muestra como "%s"', (escrito, mostrado) => {
    // Comprueba el texto con formato que se muestra
    expect(formatearTelefono(escrito)).toBe(mostrado);
  });

  // Test 6: Descarte de lo que va antes del 9 en el teléfono (por ejemplo +56)
  it("siempre empieza con 9: lo que va antes se descarta (por ejemplo +56)", () => {
    // Comprueba el texto con formato que se muestra
    expect(formatearTelefono("+56 9 1234 5678")).toBe("9 1234 5678");
    expect(formatearTelefono("212345678")).toBe("");
  });

  // Test 7: Límite de 9 dígitos en el teléfono
  it("no deja escribir más de 9 dígitos", () => {
    // Comprueba el texto con formato que se muestra
    expect(formatearTelefono("9123456789")).toBe("9 1234 5678");
  });
});

describe("Formulario de adopción", () => {
  // Test 8: Validación de un formulario de adopción completo y correcto
  it("acepta un formulario válido y entrega el teléfono con +56", () => {
    const datos = adopcionFormSchema.parse(formularioValido);
    // Comprueba que el teléfono y el RUT quedan normalizados
    expect(datos.telefono).toBe("+56912345678");
    expect(datos.rut).toBe("12345678-5");
  });

  // Test 9: Obligatoriedad de seleccionar un animal
  it("exige seleccionar un animal", () => {
    // Comprueba que se entrega el mensaje de error esperado
    expect(errores(adopcionFormSchema.safeParse({ ...formularioValido, animalId: "" }))).toContain(
      "Debe seleccionar un animal"
    );
  });

  describe("nombre completo", () => {
    // Test 10: Rechazo de nombres con menos de 3 caracteres
    it("exige al menos 3 caracteres", () => {
      // Comprueba que se entrega el mensaje de error esperado
      expect(errores(adopcionFormSchema.safeParse({ ...formularioValido, nombre: "Al" }))).toContain(
        "El nombre debe tener al menos 3 caracteres"
      );
    });

    // Test 11: Aceptación del apóstrofo entre dos letras
    it.each(["O'Higgins", "D’Angelo Rossi"])('acepta el apóstrofo entre dos letras: "%s"', (nombre) => {
      // Comprueba que la validación acepta los datos
      expect(adopcionFormSchema.safeParse({ ...formularioValido, nombre }).success).toBe(true);
    });

    // Test 12: Rechazo del apóstrofo mal ubicado
    it.each(["'Ana", "Ana Soto'", "O''Higgins"])('rechaza el apóstrofo mal ubicado: "%s"', (nombre) => {
      // Comprueba que la validación rechaza los datos
      expect(adopcionFormSchema.safeParse({ ...formularioValido, nombre }).success).toBe(false);
    });

    // Test 13: Rechazo de nombres con números
    it("rechaza números", () => {
      // Comprueba que la validación rechaza los datos
      expect(adopcionFormSchema.safeParse({ ...formularioValido, nombre: "Ana2" }).success).toBe(false);
    });
  });

  // Test 14: Rechazo de un RUT con dígito verificador incorrecto
  it("rechaza un RUT con dígito verificador incorrecto", () => {
    // Comprueba que se entrega el mensaje de error esperado
    expect(errores(adopcionFormSchema.safeParse({ ...formularioValido, rut: "12.345.678-9" }))).toContain(
      "Dígito verificador del RUT inválido"
    );
  });

  // Test 15: Rechazo de un teléfono fijo
  it("rechaza un teléfono fijo (debe ser celular que empieza con 9)", () => {
    // Comprueba que la validación rechaza los datos
    expect(adopcionFormSchema.safeParse({ ...formularioValido, telefono: "2 1234 5678" }).success).toBe(false);
  });

  // Test 16: Obligatoriedad de seleccionar una comuna de la lista
  it("exige seleccionar una comuna de la lista", () => {
    // Comprueba que se entrega el mensaje de error esperado
    expect(errores(adopcionFormSchema.safeParse({ ...formularioValido, comuna: "" }))).toContain(
      "Debe seleccionar una comuna"
    );
  });

  // Test 17: Validación del largo de la dirección (5 a 100 caracteres)
  it("la dirección debe tener entre 5 y 100 caracteres", () => {
    // Comprueba que la validación rechaza los datos
    expect(adopcionFormSchema.safeParse({ ...formularioValido, direccion: "Cal" }).success).toBe(false);
    expect(adopcionFormSchema.safeParse({ ...formularioValido, direccion: "x".repeat(101) }).success).toBe(false);
  });

  // Test 18: Validación del máximo de caracteres de otras mascotas y del motivo
  it("otras mascotas (200) y motivo (300) tienen máximo de caracteres", () => {
    // Comprueba que la validación rechaza los datos
    expect(adopcionFormSchema.safeParse({ ...formularioValido, otrasMascotas: "x".repeat(201) }).success).toBe(false);
    expect(adopcionFormSchema.safeParse({ ...formularioValido, motivo: "x".repeat(301) }).success).toBe(false);
  });
});

describe("Consulta del estado de la solicitud", () => {
  // Test 19: Validación del RUT y el correo de la consulta de estado
  it("pide un RUT y un correo válidos", () => {
    // Comprueba que la validación acepta los datos
    expect(consultaSolicitudSchema.safeParse({ rut: "12.345.678-5", email: "ana@correo.cl" }).success).toBe(true);
    // Comprueba que la validación rechaza los datos
    expect(consultaSolicitudSchema.safeParse({ rut: "123", email: "ana" }).success).toBe(false);
  });
});
