import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ParametresPageClient from "./parametres-client";

export default async function ParametresPage() {
  const { orgRole } = await auth();
  if (orgRole !== "org:admin") {
    redirect("/app");
  }
  return <ParametresPageClient />;
}
