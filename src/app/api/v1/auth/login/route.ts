import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { signMobileToken } from "@/lib/mobile-token";
import { loginSchema } from "@/lib/validation";
import { tenantErrorResponse } from "@/lib/tenant";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

// Point d'entree dedie au client mobile (le web se connecte via NextAuth /
// signIn, qui pose un cookie de session — un client React Native a besoin
// d'un token Bearer explicite, cf. lib/mobile-token.ts).
export async function POST(req: NextRequest) {
  try {
    const { phone, password } = loginSchema.parse(await req.json());

    // Protection brute force best-effort : par IP et par numero, cf. lib/rate-limit.ts.
    const ip = getClientIp(req);
    const byIp = checkRateLimit(`login:ip:${ip}`, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MS);
    const byPhone = checkRateLimit(`login:phone:${phone}`, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MS);
    if (byIp.limited || byPhone.limited) {
      const retryAfterSeconds = Math.max(byIp.retryAfterSeconds ?? 0, byPhone.retryAfterSeconds ?? 0);
      return NextResponse.json(
        { error: "Trop de tentatives, reessayez plus tard" },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    if (!user) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }
    if (user.isActive !== 1) {
      return NextResponse.json({ error: "Compte desactive" }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    const token = await signMobileToken(user.id);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        role: user.role,
        isPlatformAdmin: user.isPlatformAdmin === 1,
      },
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
