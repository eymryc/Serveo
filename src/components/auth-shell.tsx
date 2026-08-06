import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand plane — not a centered SaaS card stack */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary px-10 py-10 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <Link href="/" className="relative">
          <LogoMark size="lg" inverted />
        </Link>
        <div className="relative max-w-md">
          <p className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Le comptoir,
            <br />
            sous controle.
          </p>
          <p className="mt-5 text-base leading-relaxed text-primary-foreground/80">
            Ventes, stock et charges — penses pour un bar ouest-africain, meme quand le reseau lache.
          </p>
        </div>
        <p className="relative text-sm text-primary-foreground/60">FCFA · Orange Money · MTN · Wave</p>
      </aside>

      <div className="relative flex flex-col bg-background">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Link href="/" className="inline-flex">
            <LogoMark size="md" />
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12">
          <div className="mx-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-500">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            {description && (
              <p className="mt-2 text-base text-muted-foreground">{description}</p>
            )}
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
