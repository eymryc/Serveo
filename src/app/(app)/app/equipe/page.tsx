import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { EquipeClient } from "@/components/equipe-client";

// Gestion d'equipe : inviter des barmen, changer les roles, retirer un membre.
// UI custom (hooks Clerk) pour rester dans le langage dense de l'app —
// plus de OrganizationProfile imbriqué (Général / Membres Clerk).
export default async function EquipePage() {
  const { orgRole } = await auth();

  if (orgRole !== "org:admin") {
    redirect("/app");
  }

  return <EquipeClient />;
}
