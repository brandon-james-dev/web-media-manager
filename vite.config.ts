import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { readFileSync } from "node:fs";

/** Version sourced from package.json so the app's version never drifts. */
const pkg = JSON.parse(readFileSync(path.resolve("package.json"), "utf-8")) as {
  version: string;
};

export default defineConfig(({ mode }) => ({
  base: mode === "github-pages" ? "/web-media-manager/" : "/",

  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  plugins: [react({ compiler: true }), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
