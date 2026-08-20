import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import RapportsPageClient from "./rapports-client";

export default async function RapportsPage() {
  const { orgRole } = await auth();
  if (orgRole !== "org:admin") {
    redirect("/app");
  }
  return <RapportsPageClient />;
}
