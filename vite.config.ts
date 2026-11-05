import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { readFileSync } from "node:fs";

/** Version sourced from package.json so the app's version never drifts. */
const pkg = JSON.parse(readFileSync(path.resolve("package.json"), "utf-8")) as {
  version: string;
};

const APP_NAME = "Web Media Manager";
const APP_SHORT_NAME = "Media Manager";

/** Offline PWA: precaches the app shell + experience; runtime-caches art and
 *  the subsonic API. `display: standalone` + a registered SW are what let
 *  mobile browsers (incl. Edge on Android) install it and hide the address
 *  bar when launched from the home screen. */
function PWA() {
  return VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["pwa/icon.svg", "pwa/icon-192.png", "pwa/icon-512.png"],
    manifest: {
      name: APP_NAME,
      short_name: APP_SHORT_NAME,
      description: "Offline-capable music library manager",
      theme_color: "#7c3aed",
      background_color: "#09090b",
      display: "standalone",
      orientation: "portrait",
      start_url: "/",
      scope: "/",
      icons: [
        { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/pwa/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      navigateFallback: "/index.html",
      runtimeCaching: [
        // Album art / thumbnails / subsonic API streams — network-first so
        // fresh data wins online, fall back to cache offline.
        {
          urlPattern: ({ url }) =>
            url.pathname.startsWith("/subsonic") || url.pathname.includes("/art/"),
          handler: "NetworkFirst",
          options: {
            cacheName: "media-art",
            networkTimeoutSeconds: 4,
            expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
      ],
    },
    devOptions: { enabled: false }, // SW off in dev (stale-cache pain); real in build
  });
}

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

  plugins: [react({ compiler: true }), tailwindcss(), PWA()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
