import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  className?: string;
};

/** Lien téléchargement app — discret, une action. */
export function AppDownloadBanner({ href, className }: Props) {
  return (
    <a
      href={href}
      download="serveo.apk"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-2.5 text-sm font-semibold tracking-wide text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        className
      )}
    >
      <Download
        className="size-4 transition-transform duration-300 group-hover:translate-y-0.5"
        strokeWidth={2}
      />
      <span className="border-b border-primary/30 pb-0.5 transition-[border-color] duration-300 group-hover:border-primary">
        Télécharger l&apos;app barman (Android)
      </span>
    </a>
  );
}
