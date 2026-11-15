import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/** Header compact du parcours auth — logo + bascule connexion/inscription. */
export function AuthHeader({ active }: { active?: "sign-in" | "sign-up" }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/50 bg-background/95 pt-safe backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3 px-5 sm:px-8 lg:px-10">
        <Link href="/" className="shrink-0 transition-opacity hover:opacity-85">
          <LogoMark size="md" priority />
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle className="text-muted-foreground hover:bg-muted hover:text-foreground" />
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "rounded-md font-medium shadow-none",
              active === "sign-in" && "border-primary/35 bg-muted"
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
              active === "sign-up" && "ring-2 ring-primary/20"
            )}
            asChild
          >
            <Link href="/sign-up" aria-current={active === "sign-up" ? "page" : undefined}>
              Créer mon compte
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
