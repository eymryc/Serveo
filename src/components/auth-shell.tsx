import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function AuthShell({
  title,
  description,
  active,
  children,
}: {
  title: string;
  description?: string;
  active?: "sign-in" | "sign-up";
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-background">
      <SiteHeader active={active} />

      <div className="grid flex-1 lg:grid-cols-2">
        <aside className="relative hidden min-h-full overflow-hidden bg-primary lg:block">
          <Image
            src="/login-register.png"
            alt="SerVeo — comptoir et identité visuelle"
            fill
            priority
            sizes="50vw"
            className="object-cover object-center"
          />
        </aside>

        <div className="relative flex flex-col bg-background">
          <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12">
            <div className="mx-auto w-full max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-500">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
              {description && (
                <p className="mt-2 text-base text-muted-foreground">{description}</p>
              )}
              <div className="mt-8">{children}</div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
