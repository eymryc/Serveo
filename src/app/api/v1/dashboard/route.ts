import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, expenses, organizations, products, sales } from "@/db/schema";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Corrige les bugs constates dans le template Sheets d'origine :
// - CA et charges sont compares sur LA MEME PERIODE (plus de "5 jours de
//   ventes vs charges du mois entier" qui donnait une marge de -720%).
// - Les pourcentages de repartition sont reellement calcules (plus de
//   "0.0%" fige).
// - L'objectif mensuel est compare au CA reel (plus de badge statique).
// - Les alertes de stock utilisent le seuil PAR PRODUIT (plus le seuil
//   global mal branche qui mettait 100% des articles en alerte).
export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await requireTenant();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : startOfMonth(new Date());
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
    const db = getDb();

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    const salesInPeriod = and(
      eq(sales.organizationId, organizationId),
      gte(sales.soldAt, from),
      lte(sales.soldAt, to)
    );
    const expensesInPeriod = and(
      eq(expenses.organizationId, organizationId),
      gte(expenses.expenseDate, from),
      lte(expenses.expenseDate, to)
    );

    const [revenueTotals] = await db
      .select({
        grossRevenue: sql<string>`coalesce(sum(${sales.grossAmount}), 0)`,
        netRevenue: sql<string>`coalesce(sum(${sales.netAmount}), 0)`,
        salesCount: sql<number>`count(*)::int`,
      })
      .from(sales)
      .where(salesInPeriod);

    const [expenseTotals] = await db
      .select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(expensesInPeriod);

    const revenueByCategory = await db
      .select({
        category: sql<string>`coalesce(${categories.name}, 'Sans categorie')`,
        amount: sql<string>`coalesce(sum(${sales.netAmount}), 0)`,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(salesInPeriod)
      .groupBy(categories.name);

    const expensesByCategory = await db
      .select({
        category: expenses.category,
        amount: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(expensesInPeriod)
      .groupBy(expenses.category);

    const stockAlerts = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.organizationId, organizationId),
          eq(products.isActive, 1),
          sql`${products.currentStock} <= ${products.stockMinThreshold}`
        )
      );

    const [stockValueRow] = await db
      .select({
        value: sql<string>`coalesce(sum(${products.currentStock} * ${products.purchasePrice}), 0)`,
        activeCount: sql<number>`count(*)::int`,
      })
      .from(products)
      .where(and(eq(products.organizationId, organizationId), eq(products.isActive, 1)));

    const netRevenue = Number(revenueTotals?.netRevenue ?? 0);
    const grossRevenue = Number(revenueTotals?.grossRevenue ?? 0);
    const totalExpenses = Number(expenseTotals?.total ?? 0);
    const netProfit = netRevenue - totalExpenses;
    const marginPct = netRevenue > 0 ? (netProfit / netRevenue) * 100 : null;
    const target = org?.monthlyRevenueTarget ? Number(org.monthlyRevenueTarget) : null;
    const goalProgressPct = target && target > 0 ? (netRevenue / target) * 100 : null;

    return NextResponse.json({
      period: { from, to },
      revenue: {
        gross: grossRevenue,
        net: netRevenue,
        salesCount: revenueTotals?.salesCount ?? 0,
        avgTicket: revenueTotals?.salesCount ? netRevenue / revenueTotals.salesCount : 0,
      },
      expenses: { total: totalExpenses, byCategory: withPercentages(expensesByCategory, totalExpenses) },
      revenueByCategory: withPercentages(revenueByCategory, netRevenue),
      result: { netProfit, marginPct, goalProgressPct, monthlyRevenueTarget: target },
      stock: {
        totalValue: Number(stockValueRow?.value ?? 0),
        activeProductsCount: stockValueRow?.activeCount ?? 0,
        alerts: stockAlerts,
        alertsCount: stockAlerts.length,
      },
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

function withPercentages<T extends { amount: string }>(rows: T[], total: number) {
  return rows.map((r) => ({
    ...r,
    amount: Number(r.amount),
    percentage: total > 0 ? (Number(r.amount) / total) * 100 : 0,
  }));
}
