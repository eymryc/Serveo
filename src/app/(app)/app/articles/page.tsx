import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import ArticlesPageClient from "./articles-client";

export default async function ArticlesPage() {
  const { orgRole } = await auth();
  if (orgRole !== "org:admin") {
    redirect("/app");
  }
  return <ArticlesPageClient />;
}
