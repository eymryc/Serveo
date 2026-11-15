"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type OrgOption = { id: string; name: string; role: "admin" | "member" };

export function OrgSwitcher({
  orgName,
  isAdmin,
  activeOrganizationId,
  organizations,
}: {
  orgName: string;
  isAdmin: boolean;
  activeOrganizationId: string;
  organizations: OrgOption[];
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  async function switchTo(organizationId: string) {
    if (organizationId === activeOrganizationId || switching) return;
    setSwitching(true);
    try {
      await apiFetch("/api/v1/me/organizations", {
        method: "POST",
        body: JSON.stringify({ organizationId }),
      });
      router.push("/app");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de changer de bar");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:opacity-60"
        disabled={switching}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{orgName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{isAdmin ? "Gerant" : "Barman"}</p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Mes bars</DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem key={org.id} onClick={() => switchTo(org.id)}>
            <span className="min-w-0 flex-1 truncate">{org.name}</span>
            <span className="text-xs text-muted-foreground">{org.role === "admin" ? "Gerant" : "Barman"}</span>
            {org.id === activeOrganizationId && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding?nouveau=1">
            <Plus className="size-4" />
            Ajouter un bar
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
