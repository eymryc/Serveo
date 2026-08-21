"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/user-menu";
import {
  BarChart3,
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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo-mark";
import { ImpersonationBanner } from "@/components/impersonation-banner";

const ICONS = {
  dashboard: LayoutDashboard,
  ventes: ShoppingCart,
  articles: Tags,
  stock: Package,
  charges: Receipt,
  rapports: BarChart3,
  equipe: Users,
  parametres: Settings,
} as const;

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

function NavLinks({
  groups,
  pathname,
  onNavigate,
  collapsed = false,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          {!collapsed && (
            <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.14em] text-sidebar-foreground/45 uppercase">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={item.label}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppShell({
  navGroups,
  isAdmin,
  isPlatformAdmin = false,
  userName,
  orgName,
  children,
}: {
  navGroups: NavGroup[];
  isAdmin: boolean;
  isPlatformAdmin?: boolean;
  userName: string;
  orgName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex min-h-16 items-center gap-2.5 border-b border-sidebar-border px-5 pt-safe">
          <Link href="/app" className="inline-flex">
            <LogoMark size="md" />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto scroll-touch px-3 py-4">
          <NavLinks groups={navGroups} pathname={pathname} />
        </div>
        <div className="border-t border-sidebar-border p-3 pb-safe">
          <div className="flex items-center justify-between gap-2 border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{orgName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{isAdmin ? "Gerant" : "Barman"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle />
              <UserMenu userName={userName} isPlatformAdmin={isPlatformAdmin} />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <ImpersonationBanner />
        {/* Top bar — mobile chrome + desktop utilities */}
        <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 pt-safe backdrop-blur-md md:min-h-16 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-[min(18rem,100%)] flex-col bg-sidebar p-0 pt-safe pb-safe">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-16 items-center border-b border-sidebar-border px-5">
                  <LogoMark size="md" />
                </div>
                <div className="flex-1 overflow-y-auto scroll-touch p-3">
                  <NavLinks
                    groups={navGroups}
                    pathname={pathname}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </div>
                <div className="border-t border-sidebar-border p-3">
                  <div className="flex items-center justify-between gap-2 border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-sidebar-foreground">{orgName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{isAdmin ? "Gerant" : "Barman"}</p>
                    </div>
                    <UserMenu userName={userName} isPlatformAdmin={isPlatformAdmin} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/app" className="inline-flex">
              <LogoMark size="sm" />
            </Link>
          </div>

          <div className="hidden md:block" />

          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <ThemeToggle />
            </div>
            <div className="md:hidden">
              <UserMenu userName={userName} isPlatformAdmin={isPlatformAdmin} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
