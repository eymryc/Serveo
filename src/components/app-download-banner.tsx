import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  className?: string;
  tone?: "light" | "on-photo";
};

/** Lien téléchargement app — discret, une action. */
export function AppDownloadBanner({ href, className, tone = "light" }: Props) {
  const onPhoto = tone === "on-photo";
  return (
    <a
      href={href}
      download="serveo.apk"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-2.5 text-sm font-semibold tracking-wide",
        onPhoto ? "text-white/90" : "text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        className
      )}
    >
      <Download
        className="size-4 transition-transform duration-300 group-hover:translate-y-0.5"
        strokeWidth={2}
      />
      <span
        className={cn(
          "border-b pb-0.5 transition-[border-color] duration-300",
          onPhoto
            ? "border-white/35 group-hover:border-white"
            : "border-primary/30 group-hover:border-primary"
        )}
      >
        Télécharger l&apos;app barman (Android)
      </span>
    </a>
  );
}
