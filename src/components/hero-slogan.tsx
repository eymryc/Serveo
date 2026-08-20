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
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div className={cn("space-y-0", className)}>
      <h1 className="text-[clamp(2.1rem,5.5vw,3.5rem)] font-bold leading-[1.08] tracking-[-0.02em]">
        <span className="block text-foreground">Votre commerce,</span>

        <span
          className="relative mt-2 block min-h-[1.35em] sm:mt-3"
          aria-live="polite"
        >
          <span className="relative inline-block max-w-full rounded-lg bg-primary/[0.07] px-3 py-1.5 ring-1 ring-primary/10 sm:px-4 sm:py-2">
            {reduceMotion ? (
              <span className="font-bold text-primary">{PHRASES[0]}</span>
            ) : (
              <TypeAnimation
                sequence={SEQUENCE}
                wrapper="span"
                speed={36}
                deletionSpeed={40}
                repeat={Infinity}
                cursor={false}
                preRenderFirstString
                className="hero-type-animation font-bold text-primary"
                aria-label={PHRASES.join(" ")}
              />
            )}
          </span>
        </span>
      </h1>

      <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:mt-5 sm:text-base">
        Encaissez en FCFA ou Mobile Money, suivez votre stock et connaissez vos marges —
        sans cahier, sans tableur, sans mauvaise surprise.
      </p>
    </div>
  );
}
