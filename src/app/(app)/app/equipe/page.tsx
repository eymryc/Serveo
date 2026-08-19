import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { EquipeClient } from "@/components/equipe-client";

// Gestion d'equipe : creer des comptes barmen, changer les roles, retirer un membre.
export default async function EquipePage() {
  const { orgRole } = await auth();

  if (orgRole !== "org:admin") {
    redirect("/app");
  }

  return <EquipeClient />;
}
