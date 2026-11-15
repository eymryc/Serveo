import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/** Header compact du parcours auth — logo + bascule connexion/inscription. */
export function AuthHeader({ active }: { active?: "sign-in" | "sign-up" }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/50 bg-background/95 pt-safe backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-8 lg:px-10">
        <Link href="/" className="min-w-0 shrink-0 transition-opacity hover:opacity-85">
          <LogoMark size="sm" className="sm:h-8" priority />
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="text-muted-foreground hover:bg-muted hover:text-foreground" />
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "rounded-md px-2.5 font-medium shadow-none sm:px-3",
              active === "sign-in" && "border-primary/35 bg-muted",
              // Sur mobile : n’affiche que l’action opposée pour éviter le débordement
              active === "sign-in" && "hidden sm:inline-flex"
            )}
            asChild
          >
            <Link href="/sign-in" aria-current={active === "sign-in" ? "page" : undefined}>
              <span className="sm:hidden">Connexion</span>
              <span className="hidden sm:inline">Se connecter</span>
            </Link>
          </Button>
          <Button
            size="sm"
            className={cn(
              "rounded-md px-2.5 font-medium shadow-none sm:px-3",
              active === "sign-up" && "ring-2 ring-primary/20",
              active === "sign-up" && "hidden sm:inline-flex"
            )}
            asChild
          >
            <Link href="/sign-up" aria-current={active === "sign-up" ? "page" : undefined}>
              <span className="sm:hidden">S&apos;inscrire</span>
              <span className="hidden sm:inline">Créer mon compte</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
