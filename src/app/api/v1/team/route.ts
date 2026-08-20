import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { HttpError } from "@/lib/http-errors";
import { hashPassword } from "@/lib/password";
import { createTeamMemberSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);

    const db = getDb();
    const members = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.organizationId, organizationId))
      .orderBy(users.createdAt);

    return NextResponse.json({ members });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

// Le gerant cree directement le compte du barman (telephone + mot de passe
// temporaire + role) — pas de flux d'invitation par email.
export async function POST(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const body = createTeamMemberSchema.parse(await req.json());
    const phone = body.phone.trim();

    const db = getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
    if (existing) {
      throw new HttpError(409, "Un compte existe deja avec ce numero de telephone");
    }

    const passwordHash = await hashPassword(body.password);
    const [member] = await db
      .insert(users)
      .values({ firstName: body.firstName, lastName: body.lastName, phone, passwordHash, organizationId, role: body.role })
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt,
      });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
