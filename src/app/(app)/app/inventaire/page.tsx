import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import InventairePageClient from "./inventaire-client";

export default async function InventairePage() {
  const { orgRole } = await auth();
  if (orgRole !== "org:admin") {
    redirect("/app");
  }
  return <InventairePageClient />;
}
