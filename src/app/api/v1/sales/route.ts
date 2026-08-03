import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { products, sales, stockMovements } from "@/db/schema";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createSaleSchema } from "@/lib/validation";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await requireTenant();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : startOfMonth(new Date());
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
    const db = getDb();

    const rows = await db
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.organizationId, organizationId),
          gte(sales.soldAt, from),
          lte(sales.soldAt, to)
        )
      )
      .orderBy(sales.soldAt);

    return NextResponse.json({ sales: rows });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

// Une vente cree TOUJOURS son mouvement de stock (sale_exit) dans la meme
// transaction — c'est le correctif direct du bug du template Sheets ou
// Ventes et Stock etaient deux feuilles saisies independamment.
export async function POST(req: NextRequest) {
  try {
    const { organizationId, userId } = await requireTenant();
    const body = createSaleSchema.parse(await req.json());
    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const [product] = await tx
        .select()
        .from(products)
        .where(and(eq(products.id, body.productId), eq(products.organizationId, organizationId)));

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }
      if (product.currentStock < body.quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const unitPrice = Number(product.unitPrice);
      const grossAmount = unitPrice * body.quantity;
      const netAmount = grossAmount - body.discount;

      const [sale] = await tx
        .insert(sales)
        .values({
          organizationId,
          productId: body.productId,
          soldAt: body.soldAt ?? new Date(),
          unitPrice: product.unitPrice,
          quantity: body.quantity,
          discount: body.discount.toString(),
          grossAmount: grossAmount.toString(),
          netAmount: netAmount.toString(),
          paymentMethod: body.paymentMethod,
          createdByUserId: userId,
        })
        .returning();

      await tx.insert(stockMovements).values({
        organizationId,
        productId: body.productId,
        type: "sale_exit",
        quantityDelta: -body.quantity,
        referenceSaleId: sale.id,
        createdByUserId: userId,
      });

      await tx
        .update(products)
        .set({ currentStock: sql`${products.currentStock} - ${body.quantity}` })
        .where(eq(products.id, body.productId));

      return sale;
    });

    return NextResponse.json({ sale: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "Stock insuffisant pour cette vente" }, { status: 409 });
    }
    return tenantErrorResponse(error);
  }
}
