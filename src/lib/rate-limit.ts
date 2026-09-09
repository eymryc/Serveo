import "server-only";

// Rate limiting best-effort en memoire — protege /api/v1/auth/* contre le
// brute force basique. Limite connue : sur Vercel (serverless
// multi-instance), chaque instance garde son propre compteur, donc la
// limite reelle est max * nombre d'instances actives, pas une garantie
// stricte cross-instance. Suffisant comme stopgap ; passer a un store
// partage (ex. Upstash Redis) si une garantie forte est necessaire.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false as const };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return { limited: true as const, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { limited: false as const };
}

export function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
