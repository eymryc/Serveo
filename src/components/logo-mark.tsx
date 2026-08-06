import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-4xl",
} as const;

/**
 * Wordmark Serveo — logo typographique (pas de fichier image).
 * "Serve" + "o" en sceau circulaire : lit comme une marque, pas un titre.
 */
export function LogoMark({
  size = "md",
  inverted = false,
  className,
}: {
  size?: keyof typeof SIZES;
  /** Sur fond primary : texte clair */
  inverted?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-label="Serveo"
      className={cn(
        "inline-flex items-center font-extrabold tracking-tighter select-none",
        inverted ? "text-primary-foreground" : "text-foreground",
        SIZES[size],
        className
      )}
    >
      <span>Serve</span>
      <span
        aria-hidden
        className={cn(
          "ml-[0.06em] inline-flex size-[0.82em] shrink-0 items-center justify-center rounded-full border-[0.1em] leading-none",
          inverted ? "border-primary-foreground" : "border-primary text-primary"
        )}
      >
        <span
          className={cn(
            "size-[0.32em] rounded-full",
            inverted ? "bg-primary-foreground" : "bg-primary"
          )}
        />
      </span>
    </span>
  );
}
