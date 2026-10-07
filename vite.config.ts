import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Zod schemas shared with the backend
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  // Don't pick up any postcss config from parent folders
  css: { postcss: {} },
  server: {
    port: 5173,
    open: true,
    // Send API calls to the Express backend (backend/)
    proxy: { "/api": "http://localhost:4000" },
  },
});
