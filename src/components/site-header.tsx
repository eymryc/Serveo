import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function SiteHeader({ active }: { active?: "sign-in" | "sign-up" }) {
  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-border/80 bg-white px-5 pt-safe sm:px-10 dark:border-border dark:bg-background">
      <Link href="/" className="transition-opacity hover:opacity-85">
        <LogoMark size="md" priority />
      </Link>

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle className="text-muted-foreground hover:bg-muted hover:text-foreground" />

        <Button
          variant={active === "sign-in" ? "default" : "ghost"}
          size="sm"
          className={cn(
            "rounded-md font-medium",
            active !== "sign-in" && "text-muted-foreground hover:text-foreground"
          )}
          asChild
        >
          <Link href="/sign-in" aria-current={active === "sign-in" ? "page" : undefined}>
            Se connecter
          </Link>
        </Button>

        <Button
          variant={
            active === "sign-up" ? "default" : active === "sign-in" ? "outline" : "default"
          }
          size="sm"
          className={cn(
            "rounded-md font-medium shadow-none",
            active === "sign-in" && "border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
          )}
          asChild
        >
          <Link href="/sign-up" aria-current={active === "sign-up" ? "page" : undefined}>
            Créer mon compte
          </Link>
        </Button>
      </div>
    </header>
  );
}
