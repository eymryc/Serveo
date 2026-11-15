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

export function HeroSlogan({
  className,
  tone = "light",
}: {
  className?: string;
  /** Sur hero photo plein écran : texte clair. */
  tone?: "light" | "on-photo";
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const onPhoto = tone === "on-photo";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture d'API navigateur après hydratation pour éviter un mismatch SSR, pattern volontaire
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div className={cn(className)}>
      <h1
        className={cn(
          "text-[clamp(2.65rem,7vw,4.35rem)] font-bold leading-[1.02] tracking-[-0.038em]",
          onPhoto ? "text-white drop-shadow-[0_1px_18px_rgba(0,0,0,0.35)]" : "text-foreground"
        )}
      >
        <span className="block">Votre commerce,</span>
        <span
          className={cn(
            "mt-2.5 block min-h-[1.15em] sm:mt-3.5",
            onPhoto ? "text-[#9fd4b8]" : "text-primary"
          )}
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
              className={cn("hero-type-animation", onPhoto && "hero-type-animation--on-photo")}
              aria-label={PHRASES.join(" ")}
            />
          )}
        </span>
      </h1>

      <p
        className={cn(
          "mt-6 max-w-[28rem] text-[16px] leading-[1.55] sm:mt-7 sm:text-[1.08rem]",
          onPhoto ? "text-white/85" : "text-muted-foreground"
        )}
      >
        Encaissez en FCFA ou Mobile Money, suivez le stock et vos marges — sans cahier.
      </p>
    </div>
  );
}
