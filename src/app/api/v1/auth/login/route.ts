import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { signMobileToken } from "@/lib/mobile-token";
import { loginSchema } from "@/lib/validation";
import { tenantErrorResponse } from "@/lib/tenant";

// Point d'entree dedie au client mobile (le web se connecte via NextAuth /
// signIn, qui pose un cookie de session — un client React Native a besoin
// d'un token Bearer explicite, cf. lib/mobile-token.ts).
export async function POST(req: NextRequest) {
  try {
    const { phone, password } = loginSchema.parse(await req.json());

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
