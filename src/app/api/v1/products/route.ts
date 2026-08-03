import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createProductSchema } from "@/lib/validation";
import { createProduct, listProducts, stripPurchasePrice } from "@/lib/products";

// Le prix d'achat (purchasePrice) revele la marge par article — masque
// pour le barman, qui n'a besoin que du prix de vente et du stock pour
// travailler.
export async function GET() {
  try {
    const { organizationId, orgRole } = await requireTenant();
    const rows = await listProducts(organizationId);

    if (orgRole !== "org:admin") {
      return NextResponse.json({ products: stripPurchasePrice(rows) });
    }

    return NextResponse.json({ products: rows });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

// Creer un nouvel article (et fixer son prix d'achat) est une decision de
// gestion reservee au gerant.
export async function POST(req: NextRequest) {
  try {
    const { organizationId, userId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const body = createProductSchema.parse(await req.json());

    const product = await createProduct({ organizationId, userId, ...body });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
