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

  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      onwarn(warning, warn) {
        // Node builtins (node:fs, node:path, node:crypto, module...) pulled
        // by itunesdb-ts's Node-only fs/checksum paths and taglib-wasm get
        // externalized for browser compatibility. Those are never called
        // in-browser (the browser uses createBrowserFs / the wasm wrapper),
        // so the per-module externalization notice is expected noise.
        const msg =
          typeof warning.message === "string" ? warning.message : "";
        if (
          msg.includes("externalized for browser compatibility") &&
          /node:|itunesdb-ts|taglib-wasm|sharp|detect-libc/.test(
            warning.id ?? msg
          )
        ) {
          return;
        }
        warn(warning);
      },
    },
  },

  plugins: [react({ compiler: true }), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
