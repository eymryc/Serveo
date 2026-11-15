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
import {
  DataEmpty,
  DataTable,
  DataTableHead,
  DataTd,
  DataTh,
  DataTr,
} from "@/components/data-table";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetPassword, setResetPassword] = useState("");
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

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setBusyId(resetTarget.id);
    try {
      await apiFetch(`/api/v1/team/${resetTarget.id}/password`, {
        method: "POST",
        body: JSON.stringify({ password: resetPassword }),
      });
      toast.success(`Mot de passe redefini — communiquez-le a ${resetTarget.name} : ${resetPassword}`);
      setResetTarget(null);
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
        eyebrow="Administration"
        title="Équipe"
        description="Créez les comptes de vos barmen et gérez les rôles. Un gérant voit tout, un barman ne voit que la saisie et le stock."
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

        <DataTable minWidth="32rem">
          <DataTableHead>
            <tr>
              <DataTh>Membre</DataTh>
              <DataTh>Rôle</DataTh>
              <DataTh align="right" className="w-14">
                Actions
              </DataTh>
            </tr>
          </DataTableHead>
          <tbody>
            {members.map((m) => {
              const isSelf = m.id === currentUserId;
              return (
                <DataTr key={m.id}>
                  <DataTd>
                    <p className="font-semibold tracking-tight">
                      {m.firstName} {m.lastName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {m.phone}
                      {isSelf ? " · vous" : ""}
                    </p>
                  </DataTd>
                  <DataTd>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        m.role === "admin" ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {ROLE_LABELS[m.role]}
                    </span>
                  </DataTd>
                  <DataTd align="right" className="px-3">
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
                          <DropdownMenuItem
                            onClick={() => {
                              setResetPassword("");
                              setResetTarget({ id: m.id, name: `${m.firstName} ${m.lastName}` });
                            }}
                          >
                            Redefinir le mot de passe
                          </DropdownMenuItem>
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
                  </DataTd>
                </DataTr>
              );
            })}
            {members.length === 0 ? (
              <DataEmpty colSpan={3}>Aucun membre pour l&apos;instant.</DataEmpty>
            ) : null}
          </tbody>
        </DataTable>
      </div>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Nouveau mot de passe</DialogTitle>
              <DialogDescription>
                Pour {resetTarget?.name}. Communiquez-le lui : il pourra se connecter immediatement avec.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="reset-password">Mot de passe temporaire</Label>
              <PasswordInput
                id="reset-password"
                required
                minLength={8}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>
                Retour
              </Button>
              <Button type="submit" disabled={!!busyId}>
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
