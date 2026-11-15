import { NextRequest, NextResponse } from "next/server";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createSaleBatchSchema, createSaleSchema } from "@/lib/validation";
import { createSale, createSaleBatch, listSales } from "@/lib/sales";

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

    const rows = await listSales(organizationId, from, to);
    return NextResponse.json({ sales: rows });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

// Deux formats acceptes : { batchId, lines[] } (facture entiere, atomique et
// idempotente) et l'ancien { productId, quantity, ... } (une ligne par
// requete) encore envoye par les APK deja installes.
export async function POST(req: NextRequest) {
  try {
    const { organizationId, userId } = await requireTenant();
    const raw = await req.json();

    if (raw && typeof raw === "object" && Array.isArray((raw as { lines?: unknown }).lines)) {
      const body = createSaleBatchSchema.parse(raw);
      const result = await createSaleBatch({ organizationId, userId, ...body });
      return NextResponse.json(
        { batchId: body.batchId, sales: result.sales, replayed: result.replayed },
        { status: result.replayed ? 200 : 201 }
      );
    }

    const body = createSaleSchema.parse(raw);
    const sale = await createSale({ organizationId, userId, ...body });
    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
