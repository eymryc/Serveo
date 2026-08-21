import { NextResponse } from "next/server";
import { count, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, products, sales, users } from "@/db/schema";
import { requirePlatformAdmin, tenantErrorResponse } from "@/lib/tenant";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const db = getDb();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [[usersCount], [orgsCount], [activeOrgs], [productsCount], [salesMonth], [revenueMonth]] =
      await Promise.all([
        db.select({ value: count() }).from(users),
        db.select({ value: count() }).from(organizations),
        db
          .select({ value: count() })
          .from(organizations)
          .where(eq(organizations.isActive, 1)),
        db.select({ value: count() }).from(products),
        db
          .select({ value: count() })
          .from(sales)
          .where(gte(sales.soldAt, monthStart)),
        db
          .select({ value: sql<string>`coalesce(sum(${sales.netAmount}), 0)` })
          .from(sales)
          .where(gte(sales.soldAt, monthStart)),
      ]);

    return NextResponse.json({
      overview: {
        usersCount: usersCount.value,
        organizationsCount: orgsCount.value,
        activeOrganizationsCount: activeOrgs.value,
        productsCount: productsCount.value,
        salesThisMonth: salesMonth.value,
        revenueThisMonth: Number(revenueMonth.value),
      },
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
