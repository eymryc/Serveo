"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  ShoppingCart,
  Tags,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo-mark";

const ICONS = {
  dashboard: LayoutDashboard,
  ventes: ShoppingCart,
  articles: Tags,
  stock: Package,
  charges: Receipt,
  equipe: Users,
  parametres: Settings,
} as const;

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
};

function NavLinks({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({
  navItems,
  isAdmin,
  children,
}: {
  navItems: NavItem[];
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-6">
            <Link href="/app" className="flex items-center gap-2 font-semibold text-foreground">
              <LogoMark size={28} />
              <span className="hidden sm:inline">Serveo</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <NavLinks items={navItems} pathname={pathname} />
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {!isAdmin && (
              <Badge variant="outline" className="hidden border-warning/40 text-warning sm:inline-flex">
                Barman
              </Badge>
            )}
            <ThemeToggle />
            <OrganizationSwitcher
              hidePersonal
              afterSelectOrganizationUrl="/app"
              afterCreateOrganizationUrl="/onboarding/sync"
              appearance={{ elements: { organizationSwitcherTrigger: "text-sm" } }}
            />
            <UserButton />

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetTitle className="px-4 pt-4 text-left">Serveo</SheetTitle>
                <nav className="flex flex-col gap-1 p-4">
                  <NavLinks items={navItems} pathname={pathname} />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <Separator />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
