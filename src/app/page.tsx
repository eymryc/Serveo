import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ArrowRight, RefreshCcw, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const FEATURES = [
  {
    icon: Wallet,
    title: "Mobile Money & FCFA",
    description: "Especes, Orange Money, MTN MoMo, Wave — au meme comptoir.",
  },
  {
    icon: RefreshCcw,
    title: "Vente = stock",
    description: "Chaque vente met a jour le stock, dans le meme geste.",
  },
  {
    icon: Users,
    title: "Roles separes",
    description: "Le barman sert, le gerant voit les marges. Pas plus.",
  },
];

export default async function LandingPage() {
  const { userId, orgId } = await auth();

  if (userId && orgId) redirect("/app");
  if (userId && !orgId) redirect("/onboarding");

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-background lg:h-dvh lg:overflow-hidden">
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_20%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_55%),radial-gradient(ellipse_at_90%_80%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <SiteHeader />

      <main className="relative z-10 flex flex-1 flex-col lg:grid lg:min-h-0 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Brand column */}
        <section className="flex min-h-0 flex-col justify-center px-5 pb-10 sm:px-10 lg:pb-10 lg:pr-8">
          <div className="max-w-xl">
            <p className="animate-in fade-in slide-in-from-left-2 text-[11px] font-semibold tracking-[0.22em] text-primary uppercase duration-500 sm:text-xs">
              Gerer · Servir · Simplifier
            </p>

            <h1 className="animate-in fade-in slide-in-from-left-3 mt-5 duration-700 sm:mt-7">
              <LogoMark
                size="xl"
                className="text-[clamp(3rem,8vw,5.75rem)] leading-none"
              />
            </h1>

            <p className="animate-in fade-in slide-in-from-left-4 mt-5 text-[clamp(1.35rem,3vw,2rem)] font-semibold leading-tight tracking-tight text-balance text-foreground duration-700">
              Le comptoir,
              <br className="hidden sm:block" />
              <span className="text-primary"> sous controle.</span>
            </p>

            <p className="animate-in fade-in slide-in-from-left-4 mt-4 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground duration-700 sm:mt-5 sm:text-base">
              Ventes, stock et charges en temps reel — FCFA et Mobile Money, sur un seul comptoir.
            </p>

            <div className="animate-in fade-in slide-in-from-left-4 mt-8 flex flex-wrap items-center gap-3 duration-700 sm:mt-10">
              <Button size="lg" className="h-12 px-6 text-base" asChild>
                <Link href="/sign-up">
                  Creer mon bar
                  <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-0.5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6 text-base" asChild>
                <Link href="/sign-in">J&apos;ai deja un compte</Link>
              </Button>
            </div>
          </div>

          <ul className="animate-in fade-in mt-10 grid grid-cols-1 gap-2.5 duration-1000 sm:mt-14 sm:grid-cols-3 sm:gap-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="card-interactive page-surface flex items-start gap-3 p-3.5 sm:flex-col sm:gap-2.5 sm:p-4"
              >
                <Icon className="size-4 shrink-0 text-primary sm:size-4.5" strokeWidth={2} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-tight text-foreground">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Full-bleed ticket plane */}
        <section className="relative overflow-hidden bg-primary px-5 py-14 sm:px-10 lg:min-h-0 lg:p-0">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(135deg, transparent 40%, color-mix(in_oklch, white 18%, transparent) 40%, color-mix(in_oklch, white 18%, transparent) 41%, transparent 41%), linear-gradient(to bottom, color-mix(in_oklch, black 12%, transparent), transparent 35%, color-mix(in_oklch, black 18%, transparent))",
            }}
          />
          {/* Filet de comptoir — lignes horizontales fines, cote tactile bar. */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, color-mix(in_oklch, white 90%, transparent) 0, color-mix(in_oklch, white 90%, transparent) 1px, transparent 1px, transparent 26px)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          <div className="relative flex flex-col items-center justify-center lg:h-full lg:px-10 xl:px-14">
            <div className="animate-in fade-in slide-in-from-right-6 w-full max-w-[22rem] duration-1000">
              {/* Receipt — product visual, not a UI card cluster */}
              <div className="group/ticket relative bg-[oklch(0.99_0.004_160)] text-foreground shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] transition-transform duration-500 ease-out hover:-translate-y-1 hover:-rotate-1">
                <div className="absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 bg-primary/30" />
                <div className="border-b border-dashed border-foreground/15 px-6 pt-7 pb-4 text-center">
                  <Image
                    src="/logo-serveo-fond-clair.png"
                    alt="Serveo"
                    width={1001}
                    height={348}
                    className="mx-auto h-6 w-auto"
                  />
                  <p className="mt-3 font-figures text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                    Ticket · Comptoir
                  </p>
                  <p className="font-figures mt-1 text-[11px] text-muted-foreground">04/08/26 · 22:14</p>
                </div>

                <ul className="font-figures space-y-3.5 px-6 py-5 text-[15px]">
                  <li className="flex justify-between gap-6">
                    <span>Flag speciale</span>
                    <span className="tabular-nums">1 500</span>
                  </li>
                  <li className="flex justify-between gap-6">
                    <span>Castel × 2</span>
                    <span className="tabular-nums">2 000</span>
                  </li>
                  <li className="flex justify-between gap-6">
                    <span>Eau minerale</span>
                    <span className="tabular-nums">500</span>
                  </li>
                </ul>

                <div className="border-t border-dashed border-foreground/15 px-6 py-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        Total FCFA
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Orange Money</p>
                    </div>
                    <p className="font-figures text-4xl font-bold tracking-tight tabular-nums">4 000</p>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-dashed border-foreground/10 pt-3">
                    <span className="relative flex size-1.5" aria-hidden>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                    </span>
                    <p className="text-[11px] text-muted-foreground">Stock mis a jour en temps reel</p>
                  </div>
                </div>

                {/* Tear edge */}
                <div
                  aria-hidden
                  className="h-3 bg-[radial-gradient(circle,transparent_6px,oklch(0.99_0.004_160)_7px)] bg-[length:12px_12px] bg-[position:0_-6px]"
                />
              </div>

              <p className="mt-6 text-center text-[11px] font-semibold tracking-[0.18em] text-primary-foreground/70 uppercase">
                Une vente. Un stock. Un ticket.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
