import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function SiteHeader({
  active,
  variant = "default",
}: {
  active?: "sign-in" | "sign-up";
  variant?: "default" | "overlay";
}) {
  const overlay = variant === "overlay";

  return (
    <header
      className={cn(
        "z-30 flex h-16 shrink-0 items-center justify-between px-5 pt-safe sm:px-10",
        overlay
          ? "absolute inset-x-0 top-0 border-b border-transparent bg-gradient-to-b from-background/90 via-background/55 to-transparent backdrop-blur-[2px]"
          : "relative border-b border-border/50 bg-background/80 backdrop-blur-md"
      )}
    >
      <Link href="/" className="transition-opacity hover:opacity-85">
        <LogoMark size="md" priority />
      </Link>

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle className="text-muted-foreground hover:bg-muted hover:text-foreground" />

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-md font-medium text-muted-foreground hover:text-foreground",
            active === "sign-in" && "bg-muted text-foreground"
          )}
          asChild
        >
          <Link href="/sign-in" aria-current={active === "sign-in" ? "page" : undefined}>
            Se connecter
          </Link>
        </Button>

        <Button size="sm" className="rounded-md font-medium shadow-none" asChild>
          <Link href="/sign-up" aria-current={active === "sign-up" ? "page" : undefined}>
            Créer mon compte
          </Link>
        </Button>
      </div>
    </header>
  );
}
