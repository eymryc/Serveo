import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSlogan } from "@/components/hero-slogan";
import { LandingFeatureCards } from "@/components/landing-feature-cards";
import { LandingHow } from "@/components/landing-how";
import { LandingPayments } from "@/components/landing-payments";
import { LandingRoles } from "@/components/landing-roles";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function LandingPage() {
  const { userId, orgId, isPlatformAdmin } = await auth();

  if (userId && orgId) redirect("/app");
  if (userId && isPlatformAdmin) redirect("/admin");
  if (userId && !orgId) redirect("/onboarding");

  const androidApkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() || "";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-background">
      <SiteHeader variant="overlay-dark" />

      <main className="relative z-10 flex flex-1 flex-col">
        {/* Hero plein viewport — une composition, marque dominante */}
        <section className="relative isolate min-h-dvh overflow-hidden">
          <Image
            src="/login-register.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="landing-hero-image object-cover object-[62%_48%]"
            aria-hidden
          />
          {/* Assombrissement : panneau gauche opaque + fondu vers la photo */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(95deg,rgba(6,10,8,0.94)_0%,rgba(6,10,8,0.9)_28%,rgba(6,10,8,0.55)_46%,rgba(6,10,8,0.18)_64%,transparent_82%)]"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 to-transparent"
          />

          <div className="relative z-10 flex min-h-dvh flex-col justify-end px-5 pb-14 pt-28 sm:px-10 sm:pb-16 lg:justify-center lg:pb-20 lg:pt-24 xl:px-14">
            <div className="landing-reveal mx-auto w-full max-w-6xl">
              <div className="max-w-[34rem]">
                <div aria-hidden className="h-px w-14 bg-[#9fd4b8]" />

                <HeroSlogan tone="on-photo" className="mt-7 sm:mt-8" />

                <div className="mt-9 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button
                    size="lg"
                    className="landing-cta-primary h-12 w-full min-w-[12.5rem] !bg-white px-7 text-base tracking-wide !text-[oklch(0.28_0.06_160)] hover:!bg-white/92 sm:w-auto"
                    asChild
                  >
                    <Link href="/sign-up">
                      Ouvrir mon commerce
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-full !border-white/65 !bg-transparent px-6 text-base !text-white hover:!bg-white/12 hover:!text-white sm:w-auto"
                    asChild
                  >
                    <Link href="/sign-in">J&apos;ai déjà un compte</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preuves quotidiennes */}
        <section
          id="quotidien"
          className="relative scroll-mt-20 border-t border-border/50 bg-background px-5 py-16 sm:px-10 sm:py-20 xl:px-14"
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
              Au quotidien
            </p>
            <h2 className="mt-3 max-w-xl text-[1.85rem] font-bold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[2.2rem]">
              Moins de paperasse.
              <span className="mt-1 block text-primary">Plus de contrôle.</span>
            </h2>
            <LandingFeatureCards className="mt-12 sm:mt-14" />
          </div>
        </section>

        {/* Parcours */}
        <section
          id="parcours"
          className="relative scroll-mt-20 bg-[color-mix(in_oklch,var(--primary)_4.5%,var(--background))] px-5 py-16 sm:px-10 sm:py-20 xl:px-14"
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
              En trois gestes
            </p>
            <h2 className="mt-3 max-w-xl text-[1.85rem] font-bold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[2.2rem]">
              Du premier verre à la clôture.
            </h2>
            <LandingHow className="mt-10 sm:mt-12" />
          </div>
        </section>

        {/* Gérant / barman */}
        <section
          id="equipe"
          className="relative scroll-mt-20 border-y border-border/50 bg-background px-5 py-16 sm:px-10 sm:py-24 xl:px-14"
        >
          <div className="mx-auto max-w-6xl">
            <LandingRoles />
          </div>
        </section>

        {/* Paiements locaux */}
        <section
          id="paiements"
          className="relative scroll-mt-20 bg-background px-5 py-16 sm:px-10 sm:py-20 xl:px-14"
        >
          <div className="mx-auto max-w-6xl">
            <LandingPayments />
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden border-t border-border/50 bg-[linear-gradient(160deg,oklch(0.28_0.06_160)_0%,oklch(0.36_0.09_158)_55%,oklch(0.42_0.1_160)_100%)] px-5 py-16 sm:px-10 sm:py-20 xl:px-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
          <div className="landing-reveal relative mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-white/55 uppercase">
                Prêt à démarrer
              </p>
              <h2 className="mt-3 text-[1.9rem] font-bold leading-[1.12] tracking-[-0.02em] text-white sm:text-[2.35rem]">
                Ouvrez votre commerce sur Serveo.
              </h2>
              <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed text-white/72">
                Compte en quelques minutes. Dashboard pour le gérant, app Android
                pour le barman — la même caisse, le même stock.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-12 min-w-[12rem] bg-white px-7 text-base tracking-wide text-[oklch(0.28_0.06_160)] hover:bg-white/92"
                asChild
              >
                <Link href="/sign-up">
                  Créer mon compte
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-white/35 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href="/sign-in">Se connecter</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter androidApkUrl={androidApkUrl || undefined} />
    </div>
  );
}
