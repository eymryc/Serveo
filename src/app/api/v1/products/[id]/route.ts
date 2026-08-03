import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { updateProductSchema } from "@/lib/validation";
import { updateProduct } from "@/lib/products";

// Modifie la fiche catalogue d'un article — reserve au gerant, comme sa
// creation. Le niveau de stock ne se modifie jamais ici, seulement via un
// mouvement de stock (POST .../stock-movements).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;
    const body = updateProductSchema.parse(await req.json());

    const product = await updateProduct(organizationId, id, body);
    return NextResponse.json({ product });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
