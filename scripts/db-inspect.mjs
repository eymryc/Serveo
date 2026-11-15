// Inspection en LECTURE SEULE de la base pointee par DATABASE_URL :
// volumetrie, etat du suivi des migrations, presence des index critiques.
// Usage : pnpm exec dotenv -e .env.local -- node scripts/db-inspect.mjs
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const q = async (text) => (await pool.query(text)).rows;

try {
  await pool.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
  const [counts] = await q(`select
    (select count(*) from organizations)::int as organizations,
    (select count(*) from users)::int as users,
    (select count(*) from sales)::int as sales,
    (select max(sold_at) from sales) as last_sale,
    (select count(*) from subscriptions)::int as subscriptions`);
  console.log("Volumetrie:", counts);

  const [migTable] = await q(`select to_regclass('drizzle.__drizzle_migrations') as t`);
  console.log("Table drizzle.__drizzle_migrations:", migTable.t ?? "absente");
  if (migTable.t) {
    console.log("Migrations appliquees:", await q(`select id, created_at from drizzle.__drizzle_migrations order by id`));
  }

  const idx = await q(`select indexname from pg_indexes
    where indexname in ('cash_sessions_one_open_per_org','inventory_sessions_one_draft_per_org','sales_batch_idx','inventory_sessions_org_date_idx')`);
  console.log("Index critiques presents:", idx.map((r) => r.indexname));

  const [neg] = await q(`select count(*)::int as n from products where current_stock < 0`);
  console.log("Produits en stock negatif:", neg.n);

  const [drift] = await q(`select count(*)::int as n from products p
    where p.current_stock <> coalesce((select sum(quantity_delta) from stock_movements m where m.product_id = p.id), 0)`);
  console.log("Produits dont current_stock != somme des mouvements:", drift.n);

  const [hasMemberships] = await q(`select to_regclass('public.memberships') as t`);
  if (hasMemberships.t) {
    const [orphans] = await q(`select count(*)::int as n from users u
      where u.organization_id is not null and not exists (
        select 1 from memberships m where m.user_id = u.id and m.organization_id = u.organization_id)`);
    console.log("Comptes dont le bar actif n'a pas de membership (doit etre 0):", orphans.n);
  }

  const [partial] = await q(`select count(*)::int as n from (
    select batch_id from sales where batch_id is not null group by batch_id, created_by_user_id
    having max(created_at) - min(created_at) > interval '30 seconds') x`);
  console.log("Factures dont les lignes sont etalees > 30s (renvois partiels probables):", partial.n);
} finally {
  await pool.end();
}
