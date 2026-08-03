import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV_ITEMS: (NavItem & { adminOnly: boolean })[] = [
  { href: "/app", label: "Dashboard", icon: "dashboard", adminOnly: false },
  { href: "/app/ventes", label: "Ventes", icon: "ventes", adminOnly: false },
  { href: "/app/stock", label: "Stock", icon: "stock", adminOnly: false },
  { href: "/app/charges", label: "Charges", icon: "charges", adminOnly: true },
  { href: "/app/equipe", label: "Equipe", icon: "equipe", adminOnly: true },
  { href: "/app/parametres", label: "Parametres", icon: "parametres", adminOnly: true },
];

// Verification d'auth au niveau du layout (pattern recommande par Clerk :
// resource-based, pas middleware-based). Toute page sous (app) en herite.
//
// La navigation est filtree par role ici, mais ce n'est qu'un confort
// d'affichage — la vraie barriere est cote API (requireAdmin dans chaque
// route sensible). Un barman qui devine l'URL /app/charges se heurte a un
// 403 serveur, pas juste a un lien cache.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }
  if (!orgId) {
    redirect("/onboarding");
  }

  const isAdmin = orgRole === "org:admin";
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <AppShell navItems={visibleItems} isAdmin={isAdmin}>
      {children}
    </AppShell>
  );
}
