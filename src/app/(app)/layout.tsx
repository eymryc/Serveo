import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV_ITEMS: (NavItem & { adminOnly: boolean })[] = [
  { href: "/app", label: "Tableau de bord", icon: "dashboard", adminOnly: false },
  { href: "/app/ventes", label: "Ventes", icon: "ventes", adminOnly: false },
  { href: "/app/articles", label: "Articles", icon: "articles", adminOnly: true },
  { href: "/app/stock", label: "Stock", icon: "stock", adminOnly: false },
  { href: "/app/charges", label: "Charges", icon: "charges", adminOnly: true },
  { href: "/app/equipe", label: "Equipe", icon: "equipe", adminOnly: true },
  { href: "/app/parametres", label: "Parametres", icon: "parametres", adminOnly: true },
];

// Verification d'auth au niveau du layout (pas middleware-based, cf.
// commentaire historique dans src/proxy.ts). Toute page sous (app) en herite.
//
// La navigation est filtree par role ici, mais ce n'est qu'un confort
// d'affichage — la vraie barriere est cote API (requireAdmin dans chaque
// route sensible). Un barman qui devine l'URL /app/charges se heurte a un
// 403 serveur, pas juste a un lien cache.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, userName, orgId, orgRole } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }
  if (!orgId) {
    redirect("/onboarding");
  }

  const db = getDb();
  const [organization] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId));

  const isAdmin = orgRole === "org:admin";
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <AppShell
      navItems={visibleItems}
      isAdmin={isAdmin}
      userName={userName ?? "Compte"}
      orgName={organization?.name ?? "Mon bar"}
    >
      {children}
    </AppShell>
  );
}
