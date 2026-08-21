import { NextResponse } from "next/server";
import { count, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses, organizations, products, sales, users } from "@/db/schema";
import { requirePlatformAdmin, tenantErrorResponse } from "@/lib/tenant";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const db = getDb();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      [usersCount],
      [orgsCount],
      [activeOrgs],
      [productsCount],
      [salesMonth],
      [revenueMonth],
      [expensesMonth],
      barsRaw,
    ] = await Promise.all([
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
        .select({
          brut: sql<string>`coalesce(sum(${sales.netAmount}), 0)`,
        })
        .from(sales)
        .where(gte(sales.soldAt, monthStart)),
      db
        .select({
          total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(gte(expenses.expenseDate, monthStart)),
      db
        .select({
          id: organizations.id,
          name: organizations.name,
          city: organizations.city,
          isActive: organizations.isActive,
          caBrut: sql<string>`coalesce((
            select sum(${sales.netAmount})
            from ${sales}
            where ${sales.organizationId} = ${organizations.id}
              and ${sales.soldAt} >= ${monthStart}
          ), 0)`,
          charges: sql<string>`coalesce((
            select sum(${expenses.amount})
            from ${expenses}
            where ${expenses.organizationId} = ${organizations.id}
              and ${expenses.expenseDate} >= ${monthStart}
          ), 0)`,
          salesCount: sql<number>`coalesce((
            select count(*)::int
            from ${sales}
            where ${sales.organizationId} = ${organizations.id}
              and ${sales.soldAt} >= ${monthStart}
          ), 0)`,
        })
        .from(organizations)
        .orderBy(organizations.name),
    ]);

    const caBrut = Number(revenueMonth.brut);
    const chargesTotal = Number(expensesMonth.total);
    const caApresCharges = caBrut - chargesTotal;

    const bars = barsRaw
      .map((b) => {
        const brut = Number(b.caBrut);
        const charges = Number(b.charges);
        return {
          id: b.id,
          name: b.name,
          city: b.city,
          isActive: b.isActive,
          salesCount: Number(b.salesCount),
          caBrut: brut,
          charges,
          caApresCharges: brut - charges,
        };
      })
      .sort((a, b) => b.caBrut - a.caBrut);

    return NextResponse.json({
      overview: {
        usersCount: usersCount.value,
        organizationsCount: orgsCount.value,
        activeOrganizationsCount: activeOrgs.value,
        productsCount: productsCount.value,
        salesThisMonth: salesMonth.value,
        caBrutThisMonth: caBrut,
        chargesThisMonth: chargesTotal,
        caApresChargesThisMonth: caApresCharges,
        // Compat anciens clients
        revenueThisMonth: caBrut,
      },
      bars,
      period: {
        from: monthStart.toISOString(),
        label: "Mois en cours",
      },
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
