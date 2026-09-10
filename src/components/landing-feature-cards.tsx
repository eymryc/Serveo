import { BellRing, RefreshCcw, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES: {
  icon: LucideIcon;
  index: string;
  title: string;
  description: string;
}[] = [
  {
    icon: Wallet,
    index: "01",
    title: "Encaissez partout",
    description: "Espèces, Orange Money, MTN MoMo, Wave — un seul total.",
  },
  {
    icon: RefreshCcw,
    index: "02",
    title: "Stock à jour",
    description: "Chaque vente met à jour le stock. Fini les écarts.",
  },
  {
    icon: BellRing,
    index: "03",
    title: "Alertes & marges",
    description: "Rupture anticipée. Bénéfices visibles pour le gérant.",
  },
];

/** Preuves produit en colonnes éditoriales — pas de cartes. */
export function LandingFeatureCards({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 divide-y divide-border/70 border-y border-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0",
        className
      )}
    >
      {FEATURES.map(({ icon: Icon, index, title, description }, i) => (
        <li
          key={title}
          className={cn(
            "landing-feature-item flex gap-4 px-0 py-7 sm:flex-col sm:gap-5 sm:px-6 sm:py-2 sm:first:pl-0 sm:last:pr-0",
            i === 1 && "sm:[animation-delay:90ms]",
            i === 2 && "sm:[animation-delay:180ms]"
          )}
        >
          <div className="flex items-center gap-3 sm:items-start">
            <span className="font-figures text-[13px] font-medium tracking-wider text-primary/70">
              {index}
            </span>
            <Icon className="size-5 shrink-0 text-primary sm:hidden" strokeWidth={1.75} />
          </div>
          <div>
            <div className="mb-3 hidden sm:block">
              <Icon className="size-5 text-primary" strokeWidth={1.75} />
            </div>
            <h3 className="text-[1.05rem] font-bold tracking-tight text-foreground">{title}</h3>
            <p className="mt-2 max-w-[18rem] text-[0.95rem] leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
