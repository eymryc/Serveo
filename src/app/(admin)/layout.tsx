import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, userName, isPlatformAdmin } = await auth();

  if (!userId) redirect("/sign-in");
  if (!isPlatformAdmin) redirect("/app");

  return <AdminShell userName={userName ?? "Admin"}>{children}</AdminShell>;
}
