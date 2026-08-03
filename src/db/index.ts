import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// neon-serverless (Pool, via websocket) est utilise plutot que neon-http
// car l'app a besoin de vraies transactions (db.transaction) pour garder
// Ventes/Stock/Produits coherents — neon-http ne supporte pas de
// transactions interactives multi-requetes.
function createDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  return drizzle(pool, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
