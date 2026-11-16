import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "packages/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "zunesync-ts": path.resolve(
        import.meta.dirname,
        "./packages/zunesync-ts/src/index.ts"
      ),
    },
  },
});
