import Image from "next/image";
import Link from "next/link";
import { AuthHeader } from "@/components/auth-header";

type AuthActive = "sign-in" | "sign-up" | "onboarding" | "forgot";

const STORY: Record<
  AuthActive,
  { eyebrow: string; line1: string; line2: string; support: string }
> = {
  "sign-in": {
    eyebrow: "Connexion",
    line1: "Reprenez",
    line2: "votre service.",
    support: "Caisse, stock et Mobile Money — prêts dès que vous vous connectez.",
  },
  "sign-up": {
    eyebrow: "Inscription",
    line1: "Votre bar,",
    line2: "sans le cahier.",
    support: "Créez le compte gérant. L’app barman suit dans la foulée.",
  },
  onboarding: {
    eyebrow: "Nouveau bar",
    line1: "Nommez",
    line2: "votre commerce.",
    support: "Chaque bar a sa caisse, son stock et son équipe — isolés.",
  },
  forgot: {
    eyebrow: "Aide",
    line1: "On vous",
    line2: "remet en selle.",
    support: "Barman : passez par le gérant. Gérant : le support Serveo.",
  },
};

export function AuthShell({
  title,
  description,
  active = "sign-in",
  footer,
  children,
}: {
  title: string;
  description?: string;
  active?: AuthActive;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const story = STORY[active];
  const headerActive =
    active === "sign-in" || active === "sign-up" ? active : undefined;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-background lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
      {/* Plan photo — dominant, éditorial */}
      <aside className="relative isolate min-h-[13.5rem] overflow-hidden sm:min-h-[16rem] lg:min-h-dvh">
        <Image
          src="/login-register.png"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="auth-hero-image object-cover object-[58%_42%]"
          aria-hidden
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(115deg,rgba(5,9,7,0.88)_0%,rgba(5,9,7,0.55)_42%,rgba(5,9,7,0.25)_70%,rgba(5,9,7,0.45)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent lg:h-56"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-end px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14 xl:px-16 xl:py-16">
          <div className="auth-reveal max-w-lg">
            <p className="text-[11px] font-semibold tracking-[0.24em] text-[#9fd4b8] uppercase">
              {story.eyebrow}
            </p>
            <p className="mt-4 text-[clamp(1.85rem,4.5vw,3.35rem)] font-bold leading-[1.02] tracking-[-0.035em] text-white">
              <span className="block">{story.line1}</span>
              <span className="mt-1 block text-[#9fd4b8]">{story.line2}</span>
            </p>
            <p className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-white/78 sm:text-[1.05rem]">
              {story.support}
            </p>
          </div>
        </div>
      </aside>

      {/* Colonne formulaire — plan solide, pas une carte flottante */}
      <section className="relative flex min-h-0 flex-1 flex-col border-t border-border/40 bg-background lg:min-h-dvh lg:border-t-0 lg:border-l">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,color-mix(in_oklch,var(--primary)_7%,transparent),transparent_50%),radial-gradient(ellipse_at_100%_100%,color-mix(in_oklch,var(--primary)_5%,transparent),transparent_45%)]"
        />

        <AuthHeader active={headerActive} />

        <div className="relative flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-10 xl:px-14">
          <div className="auth-reveal mx-auto w-full max-w-[22.5rem]">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
              Serveo
            </p>
            <h1 className="mt-3 text-[1.75rem] font-bold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[2rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 text-[0.98rem] leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}

            <div className="mt-8">{children}</div>

            {active === "sign-in" ? (
              <p className="mt-8 border-t border-border/60 pt-6 text-sm text-muted-foreground">
                Pas encore de compte ?{" "}
                <Link
                  href="/sign-up"
                  className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Créer mon compte
                </Link>
              </p>
            ) : null}
            {active === "sign-up" ? (
              <p className="mt-8 border-t border-border/60 pt-6 text-sm text-muted-foreground">
                Déjà un compte ?{" "}
                <Link
                  href="/sign-in"
                  className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Se connecter
                </Link>
              </p>
            ) : null}
            {footer ? (
              <div className="mt-8 border-t border-border/60 pt-6">{footer}</div>
            ) : null}
          </div>
        </div>

        <div className="relative border-t border-border/50 px-5 py-4 text-[11px] tracking-[0.12em] text-muted-foreground uppercase sm:px-8 lg:px-10">
          Gérer · Servir · Simplifier
        </div>
      </section>
    </div>
  );
}
