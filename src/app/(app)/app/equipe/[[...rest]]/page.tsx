import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { OrganizationProfile } from "@clerk/nextjs";

// Gestion d'equipe : inviter des barmen, changer les roles (gerant/membre),
// retirer un membre. Delegue entierement au composant Clerk maintenu
// plutot que reimplementer un flux d'invitation par email a la main.
export default async function EquipePage() {
  const { orgRole } = await auth();

  if (orgRole !== "org:admin") {
    redirect("/app");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Equipe</h1>
        <p className="text-sm text-neutral-500">
          Invitez vos barmen et gerez les roles. Un gerant voit tout, un barman ne voit que la
          saisie des ventes et le stock.
        </p>
      </div>
      <OrganizationProfile path="/app/equipe" routing="path" />
    </div>
  );
}
