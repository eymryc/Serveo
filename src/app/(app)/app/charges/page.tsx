import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ChargesPageClient from "./charges-client";

export default async function ChargesPage() {
  const { orgRole } = await auth();
  if (orgRole !== "org:admin") {
    redirect("/app");
  }
  return <ChargesPageClient />;
}
