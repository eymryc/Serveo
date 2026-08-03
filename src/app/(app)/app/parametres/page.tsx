import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import ParametresPageClient from "./parametres-client";

export default async function ParametresPage() {
  const { orgRole } = await auth();
  if (orgRole !== "org:admin") {
    redirect("/app");
  }
  return <ParametresPageClient />;
}
