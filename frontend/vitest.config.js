import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Configuración de las pruebas del frontend:
// - Nivel 1: pruebas unitarias de los esquemas Zod (src/schemas/__tests__)
// - Nivel 2: pruebas de componentes e interfaz (src/pages/__tests__)
export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/__tests__/**/*.test.{js,jsx}"],
    // JSDOM simula el DOM del navegador en Node.js para poder montar los componentes
    environment: "jsdom",
    setupFiles: ["./src/setupTests.js"],
    // Cada prueba parte con los mocks limpios
    clearMocks: true,
  },
});
