import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "01",
    title: "Ouvrez la caisse",
    body: "Fond de départ, équipe connectée. Le service commence sans cahier ni calculatrice.",
  },
  {
    n: "02",
    title: "Encaissez chaque vente",
    body: "Espèces, Orange Money, MTN MoMo, Wave. Le stock descend tout seul.",
  },
  {
    n: "03",
    title: "Lisez les marges",
    body: "CA, bénéfices, alertes de rupture — le gérant voit tout, le barman reste sur la caisse.",
  },
] as const;

/** Parcours métier en trois temps — layout editorial, pas de cartes. */
export function LandingHow({ className }: { className?: string }) {
  return (
    <ol
      className={cn(
        "grid gap-10 border-t border-border/70 pt-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border/70 sm:border-y sm:pt-0 sm:pb-0",
        className
      )}
    >
      {STEPS.map((step, i) => (
        <li
          key={step.n}
          className={cn(
            "landing-feature-item sm:px-8 sm:py-10",
            i === 0 && "sm:pl-0",
            i === STEPS.length - 1 && "sm:pr-0",
            i === 1 && "sm:[animation-delay:100ms]",
            i === 2 && "sm:[animation-delay:200ms]"
          )}
        >
          <p className="font-figures text-[13px] font-semibold tracking-[0.18em] text-primary/75">
            {step.n}
          </p>
          <h3 className="mt-4 text-[1.35rem] font-bold tracking-tight text-foreground sm:text-[1.45rem]">
            {step.title}
          </h3>
          <p className="mt-3 max-w-[22rem] text-[0.98rem] leading-relaxed text-muted-foreground">
            {step.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
