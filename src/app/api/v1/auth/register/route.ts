import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { errorResponse, HttpError } from "@/lib/http-errors";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

// Route publique : creation d'un compte (pas encore rattache a un bar).
// L'etape suivante (POST /api/v1/organization) cree le bar et rattache ce
// compte comme gerant.
export async function POST(req: NextRequest) {
  try {
    // Protection contre la creation en masse de comptes, cf. lib/rate-limit.ts.
    const ip = getClientIp(req);
    const limit = checkRateLimit(`register:ip:${ip}`, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MS);
    if (limit.limited) {
      return NextResponse.json(
        { error: "Trop de tentatives, reessayez plus tard" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const body = registerSchema.parse(await req.json());
    const phone = body.phone.trim();
    const db = getDb();

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
    if (existing) {
      throw new HttpError(409, "Un compte existe deja avec ce numero de telephone");
    }

    const passwordHash = await hashPassword(body.password);
    const [user] = await db
      .insert(users)
      .values({ firstName: body.firstName, lastName: body.lastName, phone, passwordHash })
      .returning({ id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
