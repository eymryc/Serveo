import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, organizations, products, sales } from "@/db/schema";
import { requirePlatformAdmin, tenantErrorResponse } from "@/lib/tenant";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const db = getDb();

    // db.$count génère une sous-requête corrélée correctement qualifiée
    // (évite "organization_id" = "id" ambigu dans un sql`` brut).
    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        city: organizations.city,
        country: organizations.country,
        isActive: organizations.isActive,
        createdAt: organizations.createdAt,
        membersCount: db.$count(
          memberships,
          eq(memberships.organizationId, organizations.id)
        ),
        productsCount: db.$count(
          products,
          eq(products.organizationId, organizations.id)
        ),
        salesCount: db.$count(sales, eq(sales.organizationId, organizations.id)),
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt));

    return NextResponse.json({
      organizations: rows.map((r) => ({
        ...r,
        membersCount: Number(r.membersCount),
        productsCount: Number(r.productsCount),
        salesCount: Number(r.salesCount),
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
