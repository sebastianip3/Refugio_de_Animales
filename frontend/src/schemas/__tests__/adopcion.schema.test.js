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
  it.each([
    ["1", "1"],
    ["12", "1-2"],
    ["1234", "123-4"],
    ["12345678", "1.234.567-8"],
    ["123456785", "12.345.678-5"],
    ["7654333k", "7.654.333-K"],
  ])('"%s" se muestra como "%s"', (escrito, mostrado) => {
    expect(formatearRut(escrito)).toBe(mostrado);
  });

  it("ordena un RUT pegado con o sin formato", () => {
    expect(formatearRut("12.345.678-5")).toBe("12.345.678-5");
    expect(formatearRut("12.345.6785")).toBe("12.345.678-5");
  });

  it("ignora letras que no sean K y la K que no va al final", () => {
    expect(formatearRut("12a3")).toBe("12-3");
    expect(formatearRut("k12")).toBe("1-2");
  });

  it("no deja escribir más de 9 caracteres (8 dígitos + verificador)", () => {
    expect(formatearRut("1234567855")).toBe("12.345.678-5");
  });
});

describe("Formato automático del teléfono mientras se escribe", () => {
  it.each([
    ["9", "9"],
    ["91234", "9 1234"],
    ["912345678", "9 1234 5678"],
  ])('"%s" se muestra como "%s"', (escrito, mostrado) => {
    expect(formatearTelefono(escrito)).toBe(mostrado);
  });

  it("siempre empieza con 9: lo que va antes se descarta (por ejemplo +56)", () => {
    expect(formatearTelefono("+56 9 1234 5678")).toBe("9 1234 5678");
    expect(formatearTelefono("212345678")).toBe("");
  });

  it("no deja escribir más de 9 dígitos", () => {
    expect(formatearTelefono("9123456789")).toBe("9 1234 5678");
  });
});

describe("Formulario de adopción", () => {
  it("acepta un formulario válido y entrega el teléfono con +56", () => {
    const datos = adopcionFormSchema.parse(formularioValido);
    expect(datos.telefono).toBe("+56912345678");
    expect(datos.rut).toBe("12345678-5");
  });

  it("exige seleccionar un animal", () => {
    expect(errores(adopcionFormSchema.safeParse({ ...formularioValido, animalId: "" }))).toContain(
      "Debe seleccionar un animal"
    );
  });

  describe("nombre completo", () => {
    it("exige al menos 3 caracteres", () => {
      expect(errores(adopcionFormSchema.safeParse({ ...formularioValido, nombre: "Al" }))).toContain(
        "El nombre debe tener al menos 3 caracteres"
      );
    });

    it.each(["O'Higgins", "D’Angelo Rossi"])('acepta el apóstrofo entre dos letras: "%s"', (nombre) => {
      expect(adopcionFormSchema.safeParse({ ...formularioValido, nombre }).success).toBe(true);
    });

    it.each(["'Ana", "Ana Soto'", "O''Higgins"])('rechaza el apóstrofo mal ubicado: "%s"', (nombre) => {
      expect(adopcionFormSchema.safeParse({ ...formularioValido, nombre }).success).toBe(false);
    });

    it("rechaza números", () => {
      expect(adopcionFormSchema.safeParse({ ...formularioValido, nombre: "Ana2" }).success).toBe(false);
    });
  });

  it("rechaza un RUT con dígito verificador incorrecto", () => {
    expect(errores(adopcionFormSchema.safeParse({ ...formularioValido, rut: "12.345.678-9" }))).toContain(
      "Dígito verificador del RUT inválido"
    );
  });

  it("rechaza un teléfono fijo (debe ser celular que empieza con 9)", () => {
    expect(adopcionFormSchema.safeParse({ ...formularioValido, telefono: "2 1234 5678" }).success).toBe(false);
  });

  it("exige seleccionar una comuna de la lista", () => {
    expect(errores(adopcionFormSchema.safeParse({ ...formularioValido, comuna: "" }))).toContain(
      "Debe seleccionar una comuna"
    );
  });

  it("la dirección debe tener entre 5 y 100 caracteres", () => {
    expect(adopcionFormSchema.safeParse({ ...formularioValido, direccion: "Cal" }).success).toBe(false);
    expect(adopcionFormSchema.safeParse({ ...formularioValido, direccion: "x".repeat(101) }).success).toBe(false);
  });

  it("otras mascotas (200) y motivo (300) tienen máximo de caracteres", () => {
    expect(adopcionFormSchema.safeParse({ ...formularioValido, otrasMascotas: "x".repeat(201) }).success).toBe(false);
    expect(adopcionFormSchema.safeParse({ ...formularioValido, motivo: "x".repeat(301) }).success).toBe(false);
  });
});

describe("Consulta del estado de la solicitud", () => {
  it("pide un RUT y un correo válidos", () => {
    expect(consultaSolicitudSchema.safeParse({ rut: "12.345.678-5", email: "ana@correo.cl" }).success).toBe(true);
    expect(consultaSolicitudSchema.safeParse({ rut: "123", email: "ana" }).success).toBe(false);
  });
});
