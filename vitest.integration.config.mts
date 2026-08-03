import { defineConfig } from "vitest/config";
import path from "node:path";

// Config separee (pas d'exclude sur *.integration.test.ts) pour
// `pnpm test:integration`, qui cible ces fichiers explicitement contre la
// vraie base Neon de dev.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "server-only": path.resolve(import.meta.dirname, "./src/test/stubs/server-only.ts"),
    },
  },
});
