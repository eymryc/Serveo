"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();

  if (!session?.impersonating) return null;

  async function stop() {
    await update({ stopImpersonating: true });
    router.push("/admin/users");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2 text-sm md:px-8">
      <p className="flex min-w-0 items-center gap-2 font-medium text-foreground">
        <Eye className="size-4 shrink-0" />
        <span className="truncate">
          Mode support — vous consultez le compte de{" "}
          <strong>
            {session.user.firstName} {session.user.lastName}
          </strong>
        </span>
      </p>
      <Button type="button" size="sm" variant="outline" onClick={stop} className="shrink-0">
        <X className="size-3.5" />
        Quitter
      </Button>
    </div>
  );
}
