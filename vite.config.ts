import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => ({
  base: mode === "github-pages" ? "/web-media-manager/" : "/",

  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@ipod-db": path.resolve(import.meta.dirname, "./packages/ipod-db"),
    },
  },
}));
