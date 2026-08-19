import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function SiteHeader({ active }: { active?: "sign-in" | "sign-up" }) {
  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-border/70 px-5 pt-safe sm:px-10">
      <Link href="/" className="transition-opacity hover:opacity-80">
        <Image src="/logo-serveo-fond-clair.png" alt="Serveo" width={1001} height={348} className="h-8 w-auto" priority />
      </Link>
      <div className="flex items-center gap-1 sm:gap-3">
        <ThemeToggle />
        <Button
          variant={active === "sign-in" ? "default" : "outline"}
          className={cn(
            "rounded-none",
            active !== "sign-in" && "border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
          )}
          asChild
        >
          <Link href="/sign-in" aria-current={active === "sign-in" ? "page" : undefined}>
            Se connecter
          </Link>
        </Button>
        <Button
          variant={active === "sign-up" ? "default" : "outline"}
          className={cn(
            "rounded-none",
            active !== "sign-up" && "border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
          )}
          asChild
        >
          <Link href="/sign-up" aria-current={active === "sign-up" ? "page" : undefined}>
            Creer mon compte
          </Link>
        </Button>
      </div>
    </header>
  );
}
