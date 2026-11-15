import Image from "next/image";
import { cn } from "@/lib/utils";

/** Deux usages, une seule source de vérité — bandeau editorial avec photo produit. */
export function LandingRoles({ className }: { className?: string }) {
  return (
    <div className={cn("grid items-stretch gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14", className)}>
      <div className="landing-reveal flex flex-col justify-center">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
          Une équipe, deux écrans
        </p>
        <h2 className="mt-3 max-w-xl text-[1.85rem] font-bold leading-[1.12] tracking-[-0.02em] text-foreground sm:text-[2.25rem]">
          Le gérant pilote.
          <span className="mt-1 block text-primary">Le barman encaisse.</span>
        </h2>

        <dl className="mt-10 space-y-8 border-t border-border/70 pt-8">
          <div>
            <dt className="text-[1.05rem] font-bold tracking-tight text-foreground">
              Dashboard web — gérant
            </dt>
            <dd className="mt-2 max-w-md text-[0.98rem] leading-relaxed text-muted-foreground">
              Ventes, stock, caisse, charges, clients à crédit. Marges et alertes
              en un coup d&apos;œil, depuis le téléphone ou l&apos;ordinateur.
            </dd>
          </div>
          <div>
            <dt className="text-[1.05rem] font-bold tracking-tight text-foreground">
              App Android — barman
            </dt>
            <dd className="mt-2 max-w-md text-[0.98rem] leading-relaxed text-muted-foreground">
              Caisse rapide, même hors réseau : la facture est gardée sur le
              téléphone et renvoyée dès que la 3G revient.
            </dd>
          </div>
        </dl>
      </div>

      <div className="landing-reveal relative min-h-[22rem] overflow-hidden sm:min-h-[28rem] lg:min-h-full lg:[animation-delay:120ms]">
        <Image
          src="/home.png"
          alt="Identité Serveo — ambiance bar"
          fill
          sizes="(max-width: 1024px) 100vw, 45vw"
          className="object-cover object-[70%_30%]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-background/25"
        />
      </div>
    </div>
  );
}
