import Image from "next/image";
import { cn } from "@/lib/utils";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/serveo-mark.png"
      alt="Serveo"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      priority
    />
  );
}
