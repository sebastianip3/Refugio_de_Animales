import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Redirige /api al backend para evitar problemas de CORS y URLs fijas
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
