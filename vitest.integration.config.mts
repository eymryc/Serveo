import { defineConfig } from "vitest/config";
import path from "node:path";

// Config separee (pas d'exclude sur *.integration.test.ts) pour
// `pnpm test:integration`. "@/db" est redirige vers une base Postgres
// locale jetable (src/test/integration-db.ts, TEST_DATABASE_URL) — jamais
// la base de .env.local, qui est celle de la prod.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 20000,
    fileParallelism: false,
  },
  resolve: {
    alias: [
      { find: /^@\/db$/, replacement: path.resolve(import.meta.dirname, "./src/test/integration-db.ts") },
      { find: "@", replacement: path.resolve(import.meta.dirname, "./src") },
      { find: "server-only", replacement: path.resolve(import.meta.dirname, "./src/test/stubs/server-only.ts") },
    ],
  },
});
