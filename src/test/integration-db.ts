// Remplace "@/db" pendant `pnpm test:integration` (alias dans
// vitest.integration.config.mts) : driver node-postgres sur une base
// jetable locale, au lieu du driver Neon. Refuse toute URL qui n'est pas
// locale — ces tests ecrivent et suppriment des donnees, ils ne doivent
// jamais pouvoir viser la base de prod de .env.local.
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

const url = process.env.TEST_DATABASE_URL;
if (!url || !/^postgres(ql)?:\/\/[^@]+@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
  throw new Error(
    "TEST_DATABASE_URL doit pointer vers un Postgres local (ex. postgres://postgres@localhost:5432/serveo_test)"
  );
}

const pool = new pg.Pool({ connectionString: url, max: 10 });
const db = drizzle(pool, { schema });

export function getDb() {
  return db;
}
