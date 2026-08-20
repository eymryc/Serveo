import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSlogan } from "@/components/hero-slogan";
import { LandingFeatureCards } from "@/components/landing-feature-cards";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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
              Gérer · Suivre · Gagner
            </p>

            <HeroSlogan className="animate-in fade-in slide-in-from-left-3 mt-5 duration-700 sm:mt-7" />

            <div className="animate-in fade-in slide-in-from-left-4 mt-8 flex flex-wrap items-center gap-3 duration-700 sm:mt-10">
              <Button size="lg" className="h-12 px-6 text-base" asChild>
                <Link href="/sign-up">
                  Ouvrir mon commerce
                  <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-0.5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6 text-base" asChild>
                <Link href="/sign-in">J&apos;ai deja un compte</Link>
              </Button>
            </div>
          </div>

          <LandingFeatureCards className="animate-in fade-in mt-10 duration-1000 sm:mt-14" />
        </section>

        {/* Full-bleed brand visual */}
        <section className="relative min-h-[22rem] overflow-hidden bg-primary lg:h-full lg:min-h-0">
          <Image
            src="/home.png"
            alt="SerVeo — ambiance bar, logo et identité visuelle"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center"
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
