import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
// Agrega verificaciones sobre el DOM, como toBeInTheDocument() o toHaveValue()
import "@testing-library/jest-dom/vitest";

// Desmonta los componentes de la prueba anterior para que cada prueba parta de cero
afterEach(() => {
  cleanup();
});
