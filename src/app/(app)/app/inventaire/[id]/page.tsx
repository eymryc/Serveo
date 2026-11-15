import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import InventaireDetailClient from "./inventaire-detail-client";

export default async function InventaireDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { orgRole } = await auth();
  if (orgRole !== "org:admin") {
    redirect("/app");
  }
  const { id } = await params;
  return <InventaireDetailClient sessionId={id} />;
}
