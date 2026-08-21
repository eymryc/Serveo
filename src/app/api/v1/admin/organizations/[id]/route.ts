import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, products, sales, users } from "@/db/schema";
import { HttpError } from "@/lib/http-errors";
import { requirePlatformAdmin, tenantErrorResponse } from "@/lib/tenant";
import { adminUpdateOrganizationSchema } from "@/lib/validation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const db = getDb();

    const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    if (!org) throw new HttpError(404, "Bar introuvable");

    const members = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        isPlatformAdmin: users.isPlatformAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.organizationId, id))
      .orderBy(desc(users.createdAt));

    const [[productsCount], [salesCount], [revenue]] = await Promise.all([
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(products)
        .where(eq(products.organizationId, id)),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(sales)
        .where(eq(sales.organizationId, id)),
      db
        .select({ value: sql<string>`coalesce(sum(${sales.netAmount}), 0)` })
        .from(sales)
        .where(eq(sales.organizationId, id)),
    ]);

    return NextResponse.json({
      organization: {
        ...org,
        createdAt: org.createdAt.toISOString(),
        productsCount: Number(productsCount.value),
        salesCount: Number(salesCount.value),
        revenueTotal: Number(revenue.value),
      },
      members: members.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const body = adminUpdateOrganizationSchema.parse(await req.json());
    const db = getDb();

    const [updated] = await db
      .update(organizations)
      .set({
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
      })
      .where(eq(organizations.id, id))
      .returning();

    if (!updated) throw new HttpError(404, "Bar introuvable");

    return NextResponse.json({
      organization: { ...updated, createdAt: updated.createdAt.toISOString() },
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
