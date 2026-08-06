import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { expenseCategories, expenses, organizations, productCategories, products, sales } from "@/db/schema";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { stripPurchasePrice } from "@/lib/products";
import {
  computeAvgTicket,
  computeDeltaPct,
  computeGoalProgressPct,
  computeMarginPct,
  computeNetProfit,
  granularityFor,
  previousPeriod,
  resolvePeriod,
  withPercentages,
  type PeriodKey,
} from "@/lib/dashboard-math";

const PERIOD_KEYS: PeriodKey[] = ["today", "week", "month", "year"];

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
    const periodParam = searchParams.get("period");
    const periodKey: PeriodKey = PERIOD_KEYS.includes(periodParam as PeriodKey)
      ? (periodParam as PeriodKey)
      : "month";
    const { from, to } = resolvePeriod(periodKey);
    const granularity = granularityFor(periodKey);
    const db = getDb();

    // Le barman voit le stock (utile pour son travail) mais pas le CA, les
    // charges, la marge ni la valeur du stock — ce sont des donnees
    // financieres reservees au gerant (cf. audit sur la separation des
    // roles). Nombre de ventes et nombre d'articles restent visibles : ce
    // sont des compteurs, pas des montants.
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
        )
        .orderBy(desc(products.createdAt));

      const [salesCountRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(sales)
        .where(
          and(eq(sales.organizationId, organizationId), gte(sales.soldAt, from), lte(sales.soldAt, to))
        );

      const [activeProductsRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(and(eq(products.organizationId, organizationId), eq(products.isActive, 1)));

      return NextResponse.json({
        restricted: true,
        period: { key: periodKey, from, to },
        salesCount: salesCountRow?.count ?? 0,
        activeProductsCount: activeProductsRow?.count ?? 0,
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

    // Periode precedente de meme duree, pour le delta affiche sur le CA Net.
    const prev = previousPeriod(from, to);
    const [previousRevenue] = await db
      .select({ netRevenue: sql<string>`coalesce(sum(${sales.netAmount}), 0)` })
      .from(sales)
      .where(
        and(
          eq(sales.organizationId, organizationId),
          gte(sales.soldAt, prev.from),
          lte(sales.soldAt, prev.to)
        )
      );

    // Serie temporelle du CA net pour la courbe — granularite adaptee a la
    // periode (heure pour "aujourd'hui", jour pour semaine/mois, mois pour
    // l'annee). Cote d'Ivoire = UTC+0 toute l'annee donc pas de conversion
    // de fuseau necessaire entre date_trunc (UTC) et l'heure locale.
    const bucketExpr =
      granularity === "hour"
        ? sql<string>`date_trunc('hour', ${sales.soldAt})`
        : granularity === "month"
          ? sql<string>`date_trunc('month', ${sales.soldAt})`
          : sql<string>`date_trunc('day', ${sales.soldAt})`;

    const timeSeriesRaw = await db
      .select({
        bucket: bucketExpr,
        net: sql<string>`coalesce(sum(${sales.netAmount}), 0)`,
      })
      .from(sales)
      .where(salesInPeriod)
      .groupBy(bucketExpr)
      .orderBy(bucketExpr);

    const paymentMethodRaw = await db
      .select({
        method: sales.paymentMethod,
        amount: sql<string>`coalesce(sum(${sales.netAmount}), 0)`,
      })
      .from(sales)
      .where(salesInPeriod)
      .groupBy(sales.paymentMethod);

    const topProductsRaw = await db
      .select({
        productId: products.id,
        name: products.name,
        quantity: sql<number>`coalesce(sum(${sales.quantity}), 0)::int`,
        amount: sql<string>`coalesce(sum(${sales.netAmount}), 0)`,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(salesInPeriod)
      .groupBy(products.id, products.name)
      .orderBy(sql`sum(${sales.netAmount}) desc`)
      .limit(5);

    const revenueByCategoryRaw = await db
      .select({
        category: sql<string>`coalesce(${productCategories.name}, 'Sans categorie')`,
        amount: sql<string>`coalesce(sum(${sales.netAmount}), 0)`,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(salesInPeriod)
      .groupBy(productCategories.name);

    const expensesByCategoryRaw = await db
      .select({
        category: sql<string>`coalesce(${expenseCategories.name}, 'Sans categorie')`,
        amount: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(expensesInPeriod)
      .groupBy(expenseCategories.name);

    const stockAlerts = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.organizationId, organizationId),
          eq(products.isActive, 1),
          sql`${products.currentStock} <= ${products.stockMinThreshold}`
        )
      )
      .orderBy(desc(products.createdAt));

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
    const previousNetRevenue = Number(previousRevenue?.netRevenue ?? 0);

    const revenueByCategory = withPercentages(
      revenueByCategoryRaw.map((r) => ({ category: r.category, amount: Number(r.amount) })),
      netRevenue
    );
    const expensesByCategory = withPercentages(
      expensesByCategoryRaw.map((r) => ({ category: r.category, amount: Number(r.amount) })),
      totalExpenses
    );
    const paymentMethodBreakdown = withPercentages(
      paymentMethodRaw.map((r) => ({ method: r.method, amount: Number(r.amount) })),
      netRevenue
    );
    const topProducts = topProductsRaw.map((r) => ({
      productId: r.productId,
      name: r.name,
      quantity: r.quantity,
      amount: Number(r.amount),
    }));
    const timeSeries = timeSeriesRaw.map((r) => ({ bucket: r.bucket, net: Number(r.net) }));

    return NextResponse.json({
      restricted: false,
      period: { key: periodKey, from, to, granularity },
      revenue: {
        gross: grossRevenue,
        net: netRevenue,
        salesCount,
        avgTicket: computeAvgTicket(netRevenue, salesCount),
        deltaPct: computeDeltaPct(netRevenue, previousNetRevenue),
      },
      timeSeries,
      expenses: { total: totalExpenses, byCategory: expensesByCategory },
      revenueByCategory,
      paymentMethodBreakdown,
      topProducts,
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
