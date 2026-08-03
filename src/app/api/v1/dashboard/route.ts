import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, expenses, organizations, products, sales } from "@/db/schema";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { stripPurchasePrice } from "@/lib/products";
import {
  computeAvgTicket,
  computeGoalProgressPct,
  computeMarginPct,
  computeNetProfit,
  withPercentages,
} from "@/lib/dashboard-math";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Corrige les bugs constates dans le template Sheets d'origine :
// - CA et charges sont compares sur LA MEME PERIODE (plus de "5 jours de
//   ventes vs charges du mois entier" qui donnait une marge de -720%).
// - Les pourcentages de repartition sont reellement calcules (cf.
//   lib/dashboard-math.ts, plus de "0.0%" fige).
// - L'objectif mensuel est compare au CA reel (plus de badge statique).
// - Les alertes de stock utilisent le seuil PAR PRODUIT (plus le seuil
//   global mal branche qui mettait 100% des articles en alerte).
export async function GET(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : startOfMonth(new Date());
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
    const db = getDb();

    // Le barman voit le stock (utile pour son travail) mais pas le CA, les
    // charges, la marge ni la valeur du stock — ce sont des donnees
    // financieres reservees au gerant (cf. audit sur la separation des
    // roles).
    if (orgRole !== "org:admin") {
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

      return NextResponse.json({
        restricted: true,
        period: { from, to },
        stock: { alerts: stripPurchasePrice(stockAlerts), alertsCount: stockAlerts.length },
      });
    }

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

    const revenueByCategoryRaw = await db
      .select({
        category: sql<string>`coalesce(${categories.name}, 'Sans categorie')`,
        amount: sql<string>`coalesce(sum(${sales.netAmount}), 0)`,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(salesInPeriod)
      .groupBy(categories.name);

    const expensesByCategoryRaw = await db
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
    const salesCount = revenueTotals?.salesCount ?? 0;
    const totalExpenses = Number(expenseTotals?.total ?? 0);
    const netProfit = computeNetProfit(netRevenue, totalExpenses);
    const marginPct = computeMarginPct(netRevenue, netProfit);
    const target = org?.monthlyRevenueTarget ? Number(org.monthlyRevenueTarget) : null;
    const goalProgressPct = computeGoalProgressPct(netRevenue, target);

    const revenueByCategory = withPercentages(
      revenueByCategoryRaw.map((r) => ({ category: r.category, amount: Number(r.amount) })),
      netRevenue
    );
    const expensesByCategory = withPercentages(
      expensesByCategoryRaw.map((r) => ({ category: r.category, amount: Number(r.amount) })),
      totalExpenses
    );

    return NextResponse.json({
      restricted: false,
      period: { from, to },
      revenue: {
        gross: grossRevenue,
        net: netRevenue,
        salesCount,
        avgTicket: computeAvgTicket(netRevenue, salesCount),
      },
      expenses: { total: totalExpenses, byCategory: expensesByCategory },
      revenueByCategory,
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
