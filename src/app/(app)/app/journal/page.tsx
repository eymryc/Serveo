import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { JournalClient } from "./journal-client";

// Journal des actions sensibles du bar (annulations, clotures, equipe...).
export default async function JournalPage() {
  const { orgRole } = await auth();

  if (orgRole !== "org:admin") {
    redirect("/app");
  }

  return <JournalClient />;
}
