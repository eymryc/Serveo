/**
 * Seed local / dev — cree (ou met a jour) le compte SUPER-ADMIN plateforme.
 * Ce compte n'appartient a aucun bar : il gere /admin uniquement.
 *
 * Variables requises dans .env.local :
 *   SEED_ADMIN_PHONE=+22507xxxxxxxx
 *   SEED_ADMIN_PASSWORD=...
 *
 * Optionnelles :
 *   SEED_ADMIN_FIRST_NAME=Admin
 *   SEED_ADMIN_LAST_NAME=Serveo
 *
 * Usage : pnpm db:seed
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { users } from "./schema";

function normalizePhone(raw: string) {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("225")) return `+${digits}`;
  return `+225${digits}`;
}

const phone = normalizePhone(process.env.SEED_ADMIN_PHONE ?? "");
const password = process.env.SEED_ADMIN_PASSWORD ?? "";
const firstName = (process.env.SEED_ADMIN_FIRST_NAME ?? "Admin").trim();
const lastName = (process.env.SEED_ADMIN_LAST_NAME ?? "Serveo").trim();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL manquant dans .env.local");
  }
  if (!phone || !password) {
    throw new Error(
      "SEED_ADMIN_PHONE et SEED_ADMIN_PASSWORD sont requis dans .env.local"
    );
  }
  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD doit faire au moins 8 caracteres");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const [existing] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (existing) {
      await db
        .update(users)
        .set({
          passwordHash,
          firstName,
          lastName,
          // Super-admin plateforme : pas rattache a un bar.
          organizationId: null,
          role: "admin",
          isPlatformAdmin: 1,
          isActive: 1,
        })
        .where(eq(users.id, existing.id));
      console.log(`Super-admin mis a jour : ${phone} (sans bar)`);
    } else {
      await db.insert(users).values({
        phone,
        passwordHash,
        firstName,
        lastName,
        organizationId: null,
        role: "admin",
        isPlatformAdmin: 1,
        isActive: 1,
      });
      console.log(`Super-admin cree : ${phone} (sans bar)`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
