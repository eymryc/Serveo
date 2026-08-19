import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { errorResponse, HttpError } from "@/lib/http-errors";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation";

// Route publique : creation d'un compte (pas encore rattache a un bar).
// L'etape suivante (POST /api/v1/organization) cree le bar et rattache ce
// compte comme gerant.
export async function POST(req: NextRequest) {
  try {
    const body = registerSchema.parse(await req.json());
    const email = body.email.trim().toLowerCase();
    const db = getDb();

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing) {
      throw new HttpError(409, "Un compte existe deja avec cet email");
    }

    const passwordHash = await hashPassword(body.password);
    const [user] = await db
      .insert(users)
      .values({ name: body.name, email, passwordHash })
      .returning({ id: users.id, name: users.name, email: users.email });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
