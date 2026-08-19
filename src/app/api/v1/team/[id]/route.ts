import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { HttpError } from "@/lib/http-errors";
import { updateTeamMemberSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;

    if (id === userId) {
      throw new HttpError(400, "Vous ne pouvez pas modifier votre propre role");
    }

    const body = updateTeamMemberSchema.parse(await req.json());
    const db = getDb();

    const [member] = await db
      .update(users)
      .set({ role: body.role })
      .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt });

    if (!member) throw new HttpError(404, "Membre introuvable");

    return NextResponse.json({ member });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;

    if (id === userId) {
      throw new HttpError(400, "Vous ne pouvez pas vous retirer vous-meme");
    }

    const db = getDb();
    const [deleted] = await db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
      .returning();

    if (!deleted) throw new HttpError(404, "Membre introuvable");

    return NextResponse.json({ success: true });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
