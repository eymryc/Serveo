import "server-only";
import { lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";

export type RateLimitResult =
  | { limited: false }
  | { limited: true; retryAfterSeconds: number };

// Fenetre fixe stockee dans Postgres : un seul compteur partage par toutes
// les instances Vercel. Si la base est injoignable on laisse passer — la
// connexion echouera de toute facon sans base, inutile d'ajouter un blocage.
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const db = getDb();
    const windowSeconds = Math.ceil(windowMs / 1000);
    const [row] = await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt: sql`now() + make_interval(secs => ${windowSeconds})` })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`CASE WHEN ${rateLimits.resetAt} <= now() THEN 1 ELSE ${rateLimits.count} + 1 END`,
          resetAt: sql`CASE WHEN ${rateLimits.resetAt} <= now() THEN excluded.reset_at ELSE ${rateLimits.resetAt} END`,
        },
      })
      .returning({
        count: rateLimits.count,
        retryAfterSeconds: sql<number>`greatest(1, ceil(extract(epoch from ${rateLimits.resetAt} - now())))::int`,
      });

    // Purge opportuniste des compteurs expires, sans job planifie.
    if (Math.random() < 0.02) {
      await db.delete(rateLimits).where(lt(rateLimits.resetAt, sql`now()`));
    }

    if (row.count > max) {
      return { limited: true, retryAfterSeconds: Number(row.retryAfterSeconds) };
    }
    return { limited: false };
  } catch (error) {
    console.error("Rate limit indisponible", error);
    return { limited: false };
  }
}

export function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function retryAfter(...results: RateLimitResult[]) {
  return Math.max(0, ...results.map((r) => (r.limited ? r.retryAfterSeconds : 0)));
}
