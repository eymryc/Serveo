"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Shield, Undo2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function UserMenu({
  userName,
  isPlatformAdmin = false,
}: {
  userName: string;
  isPlatformAdmin?: boolean;
}) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const impersonating = Boolean(session?.impersonating);

  async function stopImpersonating() {
    await update({ stopImpersonating: true });
    router.push("/admin/users");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex size-8 shrink-0 items-center justify-center rounded-none border border-sidebar-border bg-sidebar text-xs font-semibold text-sidebar-foreground hover:bg-sidebar-accent">
        {initials(userName)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="truncate">{userName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {impersonating && (
          <DropdownMenuItem onClick={stopImpersonating}>
            <Undo2 className="size-4" />
            Quitter ce compte
          </DropdownMenuItem>
        )}
        {isPlatformAdmin && !impersonating && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield className="size-4" />
              Back-office
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="size-4" />
          Se deconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
