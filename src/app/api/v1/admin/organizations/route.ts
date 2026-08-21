import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, products, sales, users } from "@/db/schema";
import { requirePlatformAdmin, tenantErrorResponse } from "@/lib/tenant";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const db = getDb();

    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        city: organizations.city,
        country: organizations.country,
        isActive: organizations.isActive,
        createdAt: organizations.createdAt,
        membersCount: sql<number>`(select count(*)::int from ${users} where ${users.organizationId} = ${organizations.id})`,
        productsCount: sql<number>`(select count(*)::int from ${products} where ${products.organizationId} = ${organizations.id})`,
        salesCount: sql<number>`(select count(*)::int from ${sales} where ${sales.organizationId} = ${organizations.id})`,
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
