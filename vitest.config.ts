import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import path from "path";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD_TIME__: JSON.stringify("1970-01-01T00:00:00.000Z"),
    __APP_COMMIT_HASH__: JSON.stringify("0000000"),
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
