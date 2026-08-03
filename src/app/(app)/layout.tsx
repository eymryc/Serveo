import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard", adminOnly: false },
  { href: "/app/ventes", label: "Ventes", adminOnly: false },
  { href: "/app/stock", label: "Stock", adminOnly: false },
  { href: "/app/charges", label: "Charges", adminOnly: true },
  { href: "/app/equipe", label: "Equipe", adminOnly: true },
  { href: "/app/parametres", label: "Parametres", adminOnly: true },
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
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <nav className="flex items-center gap-4">
          <span className="font-semibold text-neutral-900">BarPilot</span>
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {!isAdmin && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Barman
            </span>
          )}
          <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/app" />
          <UserButton />
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
