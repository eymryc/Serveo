import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

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
        <LogoMark size={32} />
        Serveo
      </Link>
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
