import { cn } from "@/lib/utils";

const FEATURES = [
  {
    index: "01",
    title: "Encaissez partout",
    description: "Espèces, Orange Money, MTN MoMo, Wave — un seul total de caisse.",
  },
  {
    index: "02",
    title: "Stock toujours juste",
    description: "Chaque vente met à jour le stock. Les écarts se voient tout de suite.",
  },
  {
    index: "03",
    title: "Alertes & marges",
    description: "Rupture anticipée. Bénéfices clairs pour le gérant, chaque jour.",
  },
] as const;

/** Preuves produit en colonnes éditoriales — pas de cartes. */
export function LandingFeatureCards({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 divide-y divide-border/70 border-y border-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0",
        className
      )}
    >
      {FEATURES.map(({ index, title, description }, i) => (
        <li
          key={title}
          className={cn(
            "landing-feature-item px-0 py-8 sm:px-7 sm:py-10 sm:first:pl-0 sm:last:pr-0",
            i === 1 && "sm:[animation-delay:90ms]",
            i === 2 && "sm:[animation-delay:180ms]"
          )}
        >
          <span className="font-figures text-[13px] font-semibold tracking-[0.18em] text-primary/70">
            {index}
          </span>
          <h3 className="mt-4 text-[1.15rem] font-bold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="mt-2.5 max-w-[18rem] text-[0.98rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </li>
      ))}
    </ul>
  );
}
