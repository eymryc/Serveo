import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, users } from "@/db/schema";
import { HttpError } from "@/lib/http-errors";
import { hashPassword } from "@/lib/password";
import { requirePlatformAdmin, tenantErrorResponse } from "@/lib/tenant";
import { adminCreateUserSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const db = getDb();

    const rows = await db
      .select({
        id: users.id,
        phone: users.phone,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        organizationId: users.organizationId,
        organizationName: organizations.name,
        isActive: users.isActive,
        isPlatformAdmin: users.isPlatformAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .orderBy(desc(users.createdAt));

    return NextResponse.json({
      users: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const body = adminCreateUserSchema.parse(await req.json());
    const phone = body.phone.trim();
    const db = getDb();

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
    if (existing) {
      throw new HttpError(409, "Un compte existe deja avec ce numero de telephone");
    }

    let organizationId: string | null = body.organizationId ?? null;
    if (organizationId) {
      const [org] = await db
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (!org) throw new HttpError(404, "Bar introuvable");
    }

    const passwordHash = await hashPassword(body.password);
    const [created] = await db
      .insert(users)
      .values({
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        phone,
        passwordHash,
        organizationId,
        role: organizationId ? body.role : "member",
        isPlatformAdmin: body.isPlatformAdmin ?? 0,
        isActive: body.isActive ?? 1,
      })
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
    if (created.organizationId) {
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, created.organizationId))
        .limit(1);
      organizationName = org?.name ?? null;
    }

    return NextResponse.json(
      {
        user: {
          ...created,
          organizationName,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
