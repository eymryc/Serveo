import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { AppShell, type NavGroup, type NavItem } from "@/components/app-shell";

// Regroupees par usage : Activite (quotidien, tout le monde), Gestion
// (catalogue/depenses/analyses, gerant), Administration (equipe/reglages,
// gerant) — plutot qu'une longue liste plate.
const NAV_GROUPS: { label: string; items: (NavItem & { adminOnly: boolean })[] }[] = [
  {
    label: "Activite",
    items: [
      { href: "/app", label: "Tableau de bord", icon: "dashboard", adminOnly: false },
      { href: "/app/ventes", label: "Ventes", icon: "ventes", adminOnly: false },
      { href: "/app/stock", label: "Stock", icon: "stock", adminOnly: false },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/app/articles", label: "Articles", icon: "articles", adminOnly: true },
      { href: "/app/charges", label: "Charges", icon: "charges", adminOnly: true },
      { href: "/app/rapports", label: "Rapports", icon: "rapports", adminOnly: true },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/app/equipe", label: "Equipe", icon: "equipe", adminOnly: true },
      { href: "/app/parametres", label: "Parametres", icon: "parametres", adminOnly: true },
    ],
  },
];

// Verification d'auth au niveau du layout (pas middleware-based, cf.
// commentaire historique dans src/proxy.ts). Toute page sous (app) en herite.
//
// La navigation est filtree par role ici, mais ce n'est qu'un confort
// d'affichage — la vraie barriere est cote API (requireAdmin dans chaque
// route sensible). Un barman qui devine l'URL /app/charges se heurte a un
// 403 serveur, pas juste a un lien cache.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, userName, orgId, orgRole, isPlatformAdmin } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }
  if (!orgId) {
    redirect(isPlatformAdmin ? "/admin" : "/onboarding");
  }

  const db = getDb();
  const [organization] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId));

  const isAdmin = orgRole === "org:admin";
  const visibleGroups: NavGroup[] = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => !item.adminOnly || isAdmin),
  })).filter((group) => group.items.length > 0);

  return (
    <AppShell
      navGroups={visibleGroups}
      isAdmin={isAdmin}
      isPlatformAdmin={isPlatformAdmin}
      userName={userName ?? "Compte"}
      orgName={organization?.name ?? "Mon bar"}
    >
      {children}
    </AppShell>
  );
}
