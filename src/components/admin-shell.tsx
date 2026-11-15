"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bug, Building2, LayoutDashboard, Menu, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo-mark";
import { UserMenu } from "@/components/user-menu";

const NAV = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/bars", label: "Bars", icon: Building2 },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/erreurs", label: "Erreurs", icon: Bug },
] as const;

function pageTitle(pathname: string) {
  if (pathname.startsWith("/admin/bars")) return "Bars";
  if (pathname.startsWith("/admin/users")) return "Utilisateurs";
  if (pathname.startsWith("/admin/erreurs")) return "Erreurs";
  return "Vue d'ensemble";
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.2em] text-white/35 uppercase">
        Navigation
      </p>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex min-h-11 items-center gap-3 rounded-sm px-3 py-2.5 text-[0.95rem] font-semibold tracking-wide transition-colors",
              active
                ? "bg-white/10 text-white"
                : "text-white/55 hover:bg-white/[0.06] hover:text-white/90"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[oklch(0.72_0.12_155)] transition-opacity",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
              )}
            />
            <Icon className="size-[18px] shrink-0 opacity-90" strokeWidth={1.75} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <Link href="/admin" className="group block space-y-1">
      <LogoMark size="md" className="brightness-0 invert" />
      <p className="text-[10px] font-semibold tracking-[0.22em] text-[oklch(0.72_0.12_155)] uppercase transition-colors group-hover:text-white/80">
        Back-office
      </p>
    </Link>
  );
}

function SidebarChrome({
  pathname,
  userName,
  onNavigate,
  showUser = true,
}: {
  pathname: string;
  userName: string;
  onNavigate?: () => void;
  showUser?: boolean;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[oklch(0.17_0.02_165)] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,oklch(0.35_0.06_155_/_0.35),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative flex min-h-16 items-center border-b border-white/10 px-5 pt-safe">
        <SidebarBrand />
      </div>

      <div className="relative flex-1 overflow-y-auto scroll-touch px-3 py-5">
        <NavLinks pathname={pathname} onNavigate={onNavigate} />
      </div>

      {showUser ? (
        <div className="relative border-t border-white/10 p-3 pb-safe">
          <div className="flex items-center justify-between gap-2 px-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="mt-0.5 text-[11px] tracking-wide text-white/40 uppercase">
                Super-admin
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 [&_button]:text-white/70 [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
              <ThemeToggle />
              <UserMenu userName={userName} isPlatformAdmin />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = pageTitle(pathname);

  return (
    <div className="admin-shell flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-[15.5rem] shrink-0 md:flex">
        <SidebarChrome pathname={pathname} userName={userName} />
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,oklch(0.42_0.1_160_/_0.08),transparent_70%)]"
        />

        <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-3 border-b border-border/70 bg-background/85 px-4 pt-safe backdrop-blur-md md:min-h-16 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(18rem,100%)] border-0 p-0 [&>button]:text-white [&>button]:hover:bg-white/10"
              >
                <SheetTitle className="sr-only">Navigation admin</SheetTitle>
                <SidebarChrome
                  pathname={pathname}
                  userName={userName}
                  showUser={false}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <Link href="/admin" className="inline-flex">
              <LogoMark size="sm" />
            </Link>
          </div>

          <div className="hidden min-w-0 md:block">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Administration
            </p>
            <p className="truncate text-sm font-bold tracking-tight text-foreground">{title}</p>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <UserMenu userName={userName} isPlatformAdmin />
          </div>

          <div className="hidden text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase md:block">
            Serveo · Plateforme
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-7 pb-[max(1.75rem,env(safe-area-inset-bottom))] md:px-8 md:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
