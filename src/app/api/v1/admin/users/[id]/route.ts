import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, users } from "@/db/schema";
import { HttpError } from "@/lib/http-errors";
import { hashPassword } from "@/lib/password";
import { requirePlatformAdmin, tenantErrorResponse } from "@/lib/tenant";
import { adminUpdateUserSchema } from "@/lib/validation";

async function ensureAnotherPlatformAdmin(db: ReturnType<typeof getDb>, excludeId: string) {
  const [others] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isPlatformAdmin, 1), eq(users.isActive, 1), ne(users.id, excludeId)))
    .limit(1);
  if (!others) {
    throw new HttpError(400, "Il doit rester au moins un super-admin actif");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: actorId } = await requirePlatformAdmin();
    const { id } = await params;
    const body = adminUpdateUserSchema.parse(await req.json());
    const db = getDb();

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) throw new HttpError(404, "Utilisateur introuvable");

    // Empêche de se retirer soi-même les droits plateforme / de se désactiver.
    if (id === actorId) {
      if (body.isPlatformAdmin === 0) {
        throw new HttpError(400, "Vous ne pouvez pas retirer vos propres droits plateforme");
      }
      if (body.isActive === 0) {
        throw new HttpError(400, "Vous ne pouvez pas desactiver votre propre compte");
      }
    }

    // Au moins un platform admin actif doit rester.
    if (body.isPlatformAdmin === 0 || body.isActive === 0) {
      if (target.isPlatformAdmin === 1) {
        await ensureAnotherPlatformAdmin(db, id);
      }
    }

    if (body.phone !== undefined) {
      const phone = body.phone.trim();
      const [taken] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.phone, phone), ne(users.id, id)))
        .limit(1);
      if (taken) {
        throw new HttpError(409, "Un compte existe deja avec ce numero de telephone");
      }
    }

    if (body.organizationId) {
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, body.organizationId))
        .limit(1);
      if (!org) throw new HttpError(404, "Bar introuvable");
    }

    const passwordHash = body.password ? await hashPassword(body.password) : undefined;

    const [updated] = await db
      .update(users)
      .set({
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.isPlatformAdmin !== undefined ? { isPlatformAdmin: body.isPlatformAdmin } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.firstName !== undefined ? { firstName: body.firstName.trim() } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName.trim() } : {}),
        ...(body.phone !== undefined ? { phone: body.phone.trim() } : {}),
        ...(body.organizationId !== undefined ? { organizationId: body.organizationId } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        phone: users.phone,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        organizationId: users.organizationId,
        isActive: users.isActive,
        isPlatformAdmin: users.isPlatformAdmin,
        createdAt: users.createdAt,
      });

    let organizationName: string | null = null;
    if (updated.organizationId) {
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, updated.organizationId))
        .limit(1);
      organizationName = org?.name ?? null;
    }

    return NextResponse.json({
      user: {
        ...updated,
        organizationName,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: actorId } = await requirePlatformAdmin();
    const { id } = await params;
    const db = getDb();

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) throw new HttpError(404, "Utilisateur introuvable");

    if (id === actorId) {
      throw new HttpError(400, "Vous ne pouvez pas supprimer votre propre compte");
    }

    if (target.isPlatformAdmin === 1 && target.isActive === 1) {
      await ensureAnotherPlatformAdmin(db, id);
    }

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
