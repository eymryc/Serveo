"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { MoreHorizontal, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
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

type RoleKey = "admin" | "member";

const ROLE_LABELS: Record<RoleKey, string> = {
  admin: "Gerant",
  member: "Barman",
};

export function EquipeClient() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleKey>("member");
  const [creating, setCreating] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function fetchMembers() {
    return apiFetch<{ members: TeamMember[] }>("/api/v1/team").then((data) => {
      setMembers(data.members);
    });
  }

  useEffect(() => {
    fetchMembers()
      .catch((err) => toast.error(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await apiFetch("/api/v1/team", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, phone, password, role }),
      });
      await fetchMembers();
      toast.success(`Compte cree — communiquez le mot de passe a ${firstName} : ${password}`);
      setFirstName("");
      setLastName("");
      setPhone("");
      setPassword("");
      setRole("member");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de creation");
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(id: string, nextRole: RoleKey) {
    setBusyId(id);
    try {
      await apiFetch(`/api/v1/team/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      await fetchMembers();
      toast.success("Role mis a jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setBusyId(removeTarget.id);
    try {
      await apiFetch(`/api/v1/team/${removeTarget.id}`, { method: "DELETE" });
      await fetchMembers();
      toast.success("Membre retire");
      setRemoveTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe"
        description="Creez les comptes de vos barmen et gerez les roles. Un gerant voit tout, un barman ne voit que la saisie et le stock."
      />

      <div className="border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">
              {members.length} membre{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleCreate}
          className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 sm:p-5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="member-firstName">Prenom</Label>
            <Input
              id="member-firstName"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-lastName">Nom</Label>
            <Input
              id="member-lastName"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-phone">Numero de telephone</Label>
            <Input
              id="member-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07 12 34 56 78"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-password">Mot de passe temporaire</Label>
            <PasswordInput
              id="member-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as RoleKey)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Barman</SelectItem>
                <SelectItem value="admin">Gerant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={creating} className="sm:col-span-2">
            <UserPlus className="size-4" />
            {creating ? "Creation…" : "Creer le compte"}
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
                const isSelf = m.id === currentUserId;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <p className="font-semibold tracking-tight">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {m.phone}
                        {isSelf ? " · vous" : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          m.role === "admin" ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {ROLE_LABELS[m.role]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {!isSelf && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" disabled={busyId === m.id}>
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {m.role !== "admin" && (
                              <DropdownMenuItem onClick={() => handleRoleChange(m.id, "admin")}>
                                Passer gerant
                              </DropdownMenuItem>
                            )}
                            {m.role !== "member" && (
                              <DropdownMenuItem onClick={() => handleRoleChange(m.id, "member")}>
                                Passer barman
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setRemoveTarget({ id: m.id, name: `${m.firstName} ${m.lastName}` })}
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

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.name} n&apos;aura plus acces a ce bar.
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
