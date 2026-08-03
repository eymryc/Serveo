import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Les tests d'integration (DB reelle) ne tournent que via
    // `pnpm test:integration`, qui les cible explicitement avec
    // DATABASE_URL charge — jamais dans le `pnpm test` par defaut.
    exclude: ["**/*.integration.test.ts", "node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "server-only": path.resolve(import.meta.dirname, "./src/test/stubs/server-only.ts"),
    },
  },
});
