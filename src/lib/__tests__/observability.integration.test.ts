import { afterEach, describe, expect, it } from "vitest";
import { eq, like } from "drizzle-orm";
import { getDb } from "@/db";
import { errorLogs, rateLimits } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { errorFingerprint, reportError } from "@/lib/error-log";

const prefix = `test:${crypto.randomUUID()}`;

afterEach(async () => {
  await getDb().delete(rateLimits).where(like(rateLimits.key, `${prefix}%`));
});

describe("checkRateLimit (Postgres)", () => {
  it("bloque au-dela du maximum dans la fenetre", async () => {
    const key = `${prefix}:seq`;
    for (let i = 0; i < 3; i++) {
      expect((await checkRateLimit(key, 3, 60_000)).limited).toBe(false);
    }
    const blocked = await checkRateLimit(key, 3, 60_000);
    expect(blocked.limited).toBe(true);
    if (blocked.limited) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("compte exactement les requetes concurrentes (pas de perte d'increment)", async () => {
    const key = `${prefix}:concurrent`;
    const results = await Promise.all(Array.from({ length: 10 }, () => checkRateLimit(key, 4, 60_000)));
    expect(results.filter((r) => !r.limited)).toHaveLength(4);
    const [row] = await getDb().select().from(rateLimits).where(eq(rateLimits.key, key));
    expect(row.count).toBe(10);
  });

  it("repart a zero une fois la fenetre expiree", async () => {
    const key = `${prefix}:expired`;
    await getDb()
      .insert(rateLimits)
      .values({ key, count: 99, resetAt: new Date(Date.now() - 1000) });
    expect((await checkRateLimit(key, 3, 60_000)).limited).toBe(false);
    const [row] = await getDb().select().from(rateLimits).where(eq(rateLimits.key, key));
    expect(row.count).toBe(1);
    expect(row.resetAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("reportError", () => {
  it("enregistre l'erreur et regroupe les occurrences d'un meme bug", async () => {
    const marker = crypto.randomUUID();
    const make = (id: string) => {
      const e = new Error(`Commande ${id} introuvable ${marker}`);
      e.stack = `Error: ${e.message}\n    at handler (src/app/api/v1/test/route.ts:10:5)`;
      return e;
    };

    await reportError(make(crypto.randomUUID()), { source: "api", path: "/api/v1/test" });
    await reportError(make(crypto.randomUUID()), { source: "api", path: "/api/v1/test" });

    const rows = await getDb().select().from(errorLogs).where(like(errorLogs.message, `%${marker}`));
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.fingerprint)).size).toBe(1);
    await getDb().delete(errorLogs).where(like(errorLogs.message, `%${marker}`));
  });

  it("distingue deux bugs differents", () => {
    expect(errorFingerprint("Stock negatif", "at a (x.ts:1)")).not.toBe(
      errorFingerprint("Produit inconnu", "at a (x.ts:1)")
    );
  });
});
