import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import FournisseursPageClient from "./fournisseurs-client";

export default async function FournisseursPage() {
  const { orgRole } = await auth();
  if (orgRole !== "org:admin") {
    redirect("/app");
  }
  return <FournisseursPageClient />;
}
