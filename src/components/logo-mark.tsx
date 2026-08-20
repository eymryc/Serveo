import Image from "next/image";
import { cn } from "@/lib/utils";

/** Logo officiel SerVeo du header (icône + wordmark). */
export const LOGO_SRC = "/logo-serveo-fond-clair.png";
export const LOGO_WIDTH = 1001;
export const LOGO_HEIGHT = 348;

const HEIGHTS = {
  sm: "h-6",
  md: "h-8",
  lg: "h-10",
  xl: "h-12",
} as const;

export function LogoMark({
  size = "md",
  className,
  priority = false,
}: {
  size?: keyof typeof HEIGHTS;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Serveo"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority || size === "xl"}
      className={cn("w-auto shrink-0 object-contain object-left", HEIGHTS[size], className)}
    />
  );
}
