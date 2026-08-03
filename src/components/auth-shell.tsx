import Link from "next/link";
import { GlassWater } from "lucide-react";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GlassWater className="size-4.5" />
        </span>
        BarPilot
      </Link>
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
