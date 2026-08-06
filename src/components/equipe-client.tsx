"use client";

import { useState } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { MoreHorizontal, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RoleKey = "org:admin" | "org:member";

const ROLE_LABELS: Record<RoleKey, string> = {
  "org:admin": "Gerant",
  "org:member": "Barman",
};

export function EquipeClient() {
  const { user } = useUser();
  const { isLoaded, organization, memberships, invitations } = useOrganization({
    memberships: { infinite: true },
    invitations: { infinite: true, status: ["pending"] },
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleKey>("org:member");
  const [inviting, setInviting] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const members = memberships?.data ?? [];
  const pending = invitations?.data ?? [];
  const memberCount = organization?.membersCount ?? members.length;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!organization || !email.trim()) return;
    setInviting(true);
    try {
      await organization.inviteMember({
        emailAddress: email.trim(),
        role,
      });
      await invitations?.revalidate?.();
      setEmail("");
      setRole("org:member");
      toast.success("Invitation envoyee");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'invitation");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(membershipId: string, nextRole: RoleKey) {
    const membership = members.find((m) => m.id === membershipId);
    if (!membership) return;
    setBusyId(membershipId);
    try {
      await membership.update({ role: nextRole });
      await memberships?.revalidate?.();
      toast.success("Role mis a jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    const membership = members.find((m) => m.id === removeTarget.id);
    if (!membership) return;
    setBusyId(removeTarget.id);
    try {
      await membership.destroy();
      await memberships?.revalidate?.();
      toast.success("Membre retire");
      setRemoveTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevoke(invitationId: string) {
    const invitation = pending.find((i) => i.id === invitationId);
    if (!invitation) return;
    setBusyId(invitationId);
    try {
      await invitation.revoke();
      await invitations?.revalidate?.();
      toast.success("Invitation annulee");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  if (!isLoaded || !organization) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Equipe"
        description="Invitez vos barmen et gerez les roles. Un gerant voit tout, un barman ne voit que la saisie et le stock."
      />

      <Tabs defaultValue="membres" className="gap-0">
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0"
        >
          <TabsTrigger
            value="membres"
            className="rounded-none px-4 py-2.5 text-[11px] font-semibold tracking-[0.1em] uppercase"
          >
            Membres
            <span className="font-figures ml-1.5 text-muted-foreground">{memberCount}</span>
          </TabsTrigger>
          <TabsTrigger
            value="invitations"
            className="rounded-none px-4 py-2.5 text-[11px] font-semibold tracking-[0.1em] uppercase"
          >
            Invitations
            {pending.length > 0 && (
              <span className="font-figures ml-1.5 text-muted-foreground">{pending.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="membres" className="mt-0 outline-none">
          <div className="border border-t-0 border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-base font-bold tracking-tight">{organization.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {memberCount} membre{memberCount !== 1 ? "s" : ""} · roles Gerant / Barman
                </p>
              </div>
            </div>

            <form
              onSubmit={handleInvite}
              className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_9rem_auto] sm:items-end sm:p-5"
            >
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Inviter par email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="barman@exemple.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as RoleKey)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org:member">Barman</SelectItem>
                    <SelectItem value="org:admin">Gerant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={inviting} className="sm:mb-0">
                <UserPlus className="size-4" />
                {inviting ? "Envoi…" : "Inviter"}
              </Button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead className="border-b border-border bg-muted/60">
                  <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    <th className="px-4 py-2.5 font-semibold sm:px-5">Membre</th>
                    <th className="px-4 py-2.5 font-semibold">Role</th>
                    <th className="w-14 px-3 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const isSelf = m.publicUserData?.userId === user?.id;
                    const memberRole = (m.role as RoleKey) in ROLE_LABELS ? (m.role as RoleKey) : "org:member";
                    const displayName =
                      [m.publicUserData?.firstName, m.publicUserData?.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                      m.publicUserData?.identifier ||
                      "Membre";
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 sm:px-5">
                          <p className="font-semibold tracking-tight">{displayName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {m.publicUserData?.identifier}
                            {isSelf ? " · vous" : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              memberRole === "org:admin" ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {ROLE_LABELS[memberRole]}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {!isSelf && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  disabled={busyId === m.id}
                                >
                                  <MoreHorizontal className="size-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {memberRole !== "org:admin" && (
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(m.id, "org:admin")}
                                  >
                                    Passer gerant
                                  </DropdownMenuItem>
                                )}
                                {memberRole !== "org:member" && (
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(m.id, "org:member")}
                                  >
                                    Passer barman
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    setRemoveTarget({ id: m.id, name: displayName })
                                  }
                                >
                                  Retirer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Aucun membre pour l&apos;instant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="mt-0 outline-none">
          <div className="border border-t-0 border-border bg-card">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <p className="text-sm font-semibold tracking-tight">Invitations en attente</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Les invites recoivent un email pour rejoindre {organization.name}.
              </p>
            </div>
            <ul className="divide-y divide-border">
              {pending.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inv.emailAddress}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ROLE_LABELS[(inv.role as RoleKey) in ROLE_LABELS ? (inv.role as RoleKey) : "org:member"]}
                      {" · "}
                      {inv.createdAt
                        ? new Date(inv.createdAt).toLocaleDateString("fr-FR")
                        : "En attente"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={busyId === inv.id}
                    onClick={() => handleRevoke(inv.id)}
                  >
                    Annuler
                  </Button>
                </li>
              ))}
              {pending.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-5">
                  Aucune invitation en attente.
                </li>
              )}
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.name} n&apos;aura plus acces a {organization.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={!!busyId}>
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
