import { BellRing, RefreshCcw, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
}[] = [
  {
    icon: Wallet,
    title: "Encaissez partout",
    description: "Espèces, Orange Money, MTN MoMo, Wave — un seul comptoir, un seul total.",
    accent: "from-primary/14 to-primary/5",
  },
  {
    icon: RefreshCcw,
    title: "Stock à jour",
    description: "Chaque vente met à jour le stock. Fini les écarts le dimanche soir.",
    accent: "from-primary/10 to-primary/[0.03]",
  },
  {
    icon: BellRing,
    title: "Alertes & bénéfices",
    description: "Rupture avant qu'il n'y en ait plus. Marges visibles pour le gérant.",
    accent: "from-primary/16 to-primary/6",
  },
];

export function LandingFeatureCards({ className }: { className?: string }) {
  return (
    <ul className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4", className)}>
      {FEATURES.map(({ icon: Icon, title, description, accent }) => (
        <li
          key={title}
          className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-white p-5 shadow-[0_1px_2px_oklch(0.22_0.02_165/6%)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_16px_40px_-24px_oklch(0.22_0.02_165/35%)]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />

          <div
            className={cn(
              "mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-black/[0.04]",
              accent
            )}
          >
            <Icon
              className="size-5 text-primary transition-transform duration-300 group-hover:scale-105"
              strokeWidth={1.75}
            />
          </div>

          <h3 className="text-sm font-bold tracking-tight text-foreground">{title}</h3>
          <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </li>
      ))}
    </ul>
  );
}
