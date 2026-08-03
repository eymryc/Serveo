import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/ventes", label: "Ventes" },
  { href: "/app/stock", label: "Stock" },
  { href: "/app/charges", label: "Charges" },
  { href: "/app/parametres", label: "Parametres" },
];

// Verification d'auth au niveau du layout (pattern recommande par Clerk :
// resource-based, pas middleware-based). Toute page sous (app) en herite.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }
  if (!orgId) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <nav className="flex items-center gap-4">
          <span className="font-semibold text-neutral-900">BarPilot</span>
          {NAV_ITEMS.map((item) => (
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
          <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/app" />
          <UserButton />
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
