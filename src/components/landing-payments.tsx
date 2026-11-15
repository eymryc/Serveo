import { cn } from "@/lib/utils";

const METHODS = ["Espèces", "Orange Money", "MTN MoMo", "Wave", "Carte / Virement"] as const;

/** Preuve locale — moyens de paiement du marché, sans pastilles ni icônes décoratives. */
export function LandingPayments({ className }: { className?: string }) {
  return (
    <div className={cn("landing-reveal", className)}>
      <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
        Paiements
      </p>
      <h2 className="mt-3 max-w-2xl text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[2rem]">
        Pensé pour le FCFA et le Mobile Money.
      </h2>
      <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-muted-foreground">
        Un seul total de caisse, quel que soit le moyen. Activez seulement ce que
        votre bar accepte — y compris un moyen local si vous ouvrez ailleurs.
      </p>
      <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-border/70 pt-8">
        {METHODS.map((m) => (
          <li
            key={m}
            className="text-[0.95rem] font-semibold tracking-wide text-foreground"
          >
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
