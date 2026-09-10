"use client";

import { useEffect, useState } from "react";
import { TypeAnimation } from "react-type-animation";
import { cn } from "@/lib/utils";

/** Accroches orientées commerçant : gestion, stock, alertes, bénéfices. */
const PHRASES = [
  "géré sans prise de tête.",
  "stock suivi en temps réel.",
  "alerté avant la rupture.",
  "bénéfices visibles chaque jour.",
  "ventes et caisse au même endroit.",
] as const;

const SEQUENCE = PHRASES.flatMap((phrase) => [phrase, 2800]);

export function HeroSlogan({ className }: { className?: string }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture d'API navigateur après hydratation pour éviter un mismatch SSR, pattern volontaire
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div className={cn(className)}>
      <h1 className="text-[clamp(2.5rem,6.4vw,4rem)] font-bold leading-[1.02] tracking-[-0.035em]">
        <span className="block text-foreground">Votre commerce,</span>
        <span
          className="mt-2.5 block min-h-[1.15em] text-primary sm:mt-3.5"
          aria-live="polite"
        >
          {reduceMotion ? (
            <span>{PHRASES[0]}</span>
          ) : (
            <TypeAnimation
              sequence={SEQUENCE}
              wrapper="span"
              speed={36}
              deletionSpeed={40}
              repeat={Infinity}
              cursor={false}
              preRenderFirstString
              className="hero-type-animation"
              aria-label={PHRASES.join(" ")}
            />
          )}
        </span>
      </h1>

      <p className="mt-6 max-w-[28rem] text-[15.5px] leading-[1.55] text-muted-foreground sm:mt-7 sm:text-[1.05rem]">
        Encaissez en FCFA ou Mobile Money, suivez le stock et vos marges — sans cahier.
      </p>
    </div>
  );
}
