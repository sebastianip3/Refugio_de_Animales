import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
     //Redirige /api al backend para evitar problemas de CORS y URLs fijas
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
