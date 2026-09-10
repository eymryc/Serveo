import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDownloadBanner } from "@/components/app-download-banner";
import { HeroSlogan } from "@/components/hero-slogan";
import { LandingFeatureCards } from "@/components/landing-feature-cards";
import { LogoMark } from "@/components/logo-mark";
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_55%),radial-gradient(ellipse_at_90%_80%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <SiteHeader variant="overlay" />

      <main className="relative z-10 flex flex-1 flex-col">
        {/* Hero — une composition plein viewport */}
        <section className="relative grid min-h-dvh flex-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="relative z-10 flex flex-col justify-center px-5 pb-14 pt-24 sm:px-10 sm:pb-16 sm:pt-28 lg:py-10 lg:pr-8 lg:pl-10 xl:pr-12 xl:pl-14">
            <div className="landing-reveal mx-auto w-full max-w-lg lg:mx-0">
              <LogoMark size="2xl" priority className="h-12 sm:h-14 lg:h-[3.75rem]" />
              <div
                aria-hidden
                className="mt-5 h-px w-14 bg-primary/55 sm:mt-6 sm:w-16"
              />

              <HeroSlogan className="mt-8 sm:mt-10" />

              <div className="mt-9 flex flex-wrap items-center gap-3 sm:mt-10">
                <Button
                  size="lg"
                  className="h-12 min-w-[12rem] px-7 text-base tracking-wide shadow-[0_10px_28px_-12px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
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
                  className="h-12 border-border/80 bg-background/60 px-6 text-base backdrop-blur-sm"
                  asChild
                >
                  <Link href="/sign-in">J&apos;ai déjà un compte</Link>
                </Button>
              </div>

              {androidApkUrl ? (
                <AppDownloadBanner href={androidApkUrl} className="mt-9 sm:mt-10" />
              ) : null}
            </div>
          </div>

          <div className="relative min-h-[22rem] overflow-hidden sm:min-h-[26rem] lg:min-h-0">
            <Image
              src="/home.png"
              alt="Serveo — ambiance bar et identité visuelle"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="landing-hero-image object-cover object-[62%_42%]"
            />
            {/* Fusion douce — image reste dominante */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent lg:bg-[linear-gradient(90deg,var(--background)_0%,color-mix(in_oklch,var(--background)_55%,transparent)_14%,transparent_32%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/20"
            />
          </div>
        </section>

        {/* Sous le fold — un message, trois preuves */}
        <section className="relative border-t border-border/50 bg-background/80 px-5 py-16 backdrop-blur-sm sm:px-10 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
              Au quotidien
            </p>
            <h2 className="mt-3 max-w-xl text-[1.85rem] font-bold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[2.15rem]">
              Moins de paperasse.
              <span className="mt-1 block text-primary">Plus de contrôle.</span>
            </h2>
            <LandingFeatureCards className="mt-12 sm:mt-14" />
          </div>
        </section>
      </main>

      <SiteFooter androidApkUrl={androidApkUrl || undefined} />
    </div>
  );
}
