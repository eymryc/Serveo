// Empreinte du schema (colonnes, index, contraintes, enums) en LECTURE SEULE,
// pour comparer la prod a ce que produit schema.ts sans pg_dump.
// Usage : DATABASE_URL=... node scripts/db-schema-fingerprint.mjs > out.txt
import pg from "pg";
import { Pool as NeonPool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
const isLocal = /localhost|127\.0\.0\.1/.test(url);
const pool = isLocal ? new pg.Pool({ connectionString: url }) : new NeonPool({ connectionString: url });
const rows = async (text) => (await pool.query(text)).rows;

try {
  const lines = [];
  for (const r of await rows(`select table_name, column_name, udt_name, numeric_precision, numeric_scale, is_nullable, column_default
      from information_schema.columns where table_schema = 'public' order by table_name, column_name`)) {
    const precision = r.udt_name === "numeric" ? `(${r.numeric_precision ?? "*"},${r.numeric_scale ?? "*"})` : "";
    lines.push(`col ${r.table_name}.${r.column_name} ${r.udt_name}${precision} null=${r.is_nullable} default=${r.column_default ?? ""}`);
  }
  for (const r of await rows(`select indexname, indexdef from pg_indexes where schemaname = 'public' order by indexname`)) {
    lines.push(`idx ${r.indexname} ${r.indexdef}`);
  }
  for (const r of await rows(`select conrelid::regclass::text as tbl, conname, pg_get_constraintdef(oid) as def
      from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2`)) {
    lines.push(`con ${r.tbl}.${r.conname} ${r.def}`);
  }
  for (const r of await rows(`select t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder) as labels
      from pg_type t join pg_enum e on e.enumtypid = t.oid group by t.typname order by 1`)) {
    lines.push(`enum ${r.typname} ${r.labels}`);
  }
  console.log(lines.join("\n"));
} finally {
  await pool.end();
}
