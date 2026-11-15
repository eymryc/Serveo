"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const LANDING_NAV = [
  { id: "quotidien", label: "Au quotidien" },
  { id: "parcours", label: "Parcours" },
  { id: "equipe", label: "Équipe" },
  { id: "paiements", label: "Paiements" },
] as const;

function goToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `/#${id}`);
}

export function SiteHeader({
  active,
  variant = "default",
}: {
  active?: "sign-in" | "sign-up";
  variant?: "default" | "overlay" | "overlay-dark";
}) {
  const landing = variant === "overlay-dark";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!landing) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [landing]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Sur la landing : transparent au-dessus de la photo, puis fond solide au scroll.
  const overHero = landing && !scrolled;
  const solid = !landing || scrolled;

  return (
    <header
      className={cn(
        "z-40 border-b pt-safe transition-[background-color,border-color,backdrop-filter,box-shadow] duration-300",
        landing ? "fixed inset-x-0 top-0" : "sticky top-0",
        overHero
          ? "border-transparent bg-gradient-to-b from-black/50 via-black/20 to-transparent"
          : "border-border/60 bg-background/92 shadow-[0_1px_0_0_color-mix(in_oklch,var(--foreground)_4%,transparent)] backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 sm:px-10 xl:px-14">
        <Link
          href="/"
          className="shrink-0 transition-opacity hover:opacity-85"
          onClick={() => setMenuOpen(false)}
        >
          <LogoMark
            size="md"
            priority
            className={cn(overHero && "brightness-0 invert")}
          />
        </Link>

        {landing ? (
          <nav
            aria-label="Sections"
            className="mx-4 hidden min-w-0 flex-1 items-center justify-center gap-0.5 md:flex lg:gap-1"
          >
            {LANDING_NAV.map((item) => (
              <Link
                key={item.id}
                href={`/#${item.id}`}
                scroll={false}
                onClick={(e) => {
                  e.preventDefault();
                  goToSection(item.id);
                }}
                className={cn(
                  "rounded-md px-2.5 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors lg:px-3",
                  overHero
                    ? "text-white/78 hover:bg-white/10 hover:text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : (
          <nav
            aria-label="Navigation"
            className="mx-4 hidden min-w-0 flex-1 items-center justify-center gap-1 sm:flex"
          >
            <Link
              href="/"
              className="rounded-md px-3 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Accueil
            </Link>
            <Link
              href="/sign-in"
              className={cn(
                "rounded-md px-3 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:bg-muted hover:text-foreground",
                active === "sign-in" ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              Connexion
            </Link>
            <Link
              href="/sign-up"
              className={cn(
                "rounded-md px-3 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:bg-muted hover:text-foreground",
                active === "sign-up" ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              Inscription
            </Link>
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {!landing || solid ? (
            <ThemeToggle
              className={cn(
                overHero
                  ? "text-white/80 hover:bg-white/10 hover:text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            />
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className={cn(
              "hidden rounded-md font-medium shadow-none sm:inline-flex",
              overHero
                ? "border-white/70 bg-transparent text-white hover:bg-white/12 hover:text-white"
                : "border-border bg-background",
              active === "sign-in" && !overHero && "border-primary/40 bg-muted",
              active === "sign-in" && overHero && "border-white bg-white/15"
            )}
            asChild
          >
            <Link href="/sign-in" aria-current={active === "sign-in" ? "page" : undefined}>
              Se connecter
            </Link>
          </Button>

          <Button
            size="sm"
            className={cn(
              "rounded-md font-medium shadow-none",
              overHero && "bg-white text-[oklch(0.28_0.06_160)] hover:bg-white/90",
              active === "sign-up" && !overHero && "ring-2 ring-primary/25"
            )}
            asChild
          >
            <Link href="/sign-up" aria-current={active === "sign-up" ? "page" : undefined}>
              Créer mon compte
            </Link>
          </Button>

          {landing ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn(
                "md:hidden",
                overHero
                  ? "text-white hover:bg-white/10 hover:text-white"
                  : "text-foreground hover:bg-muted"
              )}
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-nav"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          ) : null}
        </div>
      </div>

      {landing && menuOpen ? (
        <div
          id="landing-mobile-nav"
          className="border-t border-border/60 bg-background/97 backdrop-blur-md md:hidden"
        >
          <nav aria-label="Sections" className="mx-auto flex max-w-6xl flex-col px-5 py-3 sm:px-10">
            {LANDING_NAV.map((item) => (
              <Link
                key={item.id}
                href={`/#${item.id}`}
                scroll={false}
                className="rounded-md px-3 py-3 text-[11px] font-semibold tracking-[0.16em] uppercase text-foreground hover:bg-muted"
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpen(false);
                  goToSection(item.id);
                }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/sign-in"
              className="rounded-md px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden"
              onClick={() => setMenuOpen(false)}
            >
              Se connecter
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
