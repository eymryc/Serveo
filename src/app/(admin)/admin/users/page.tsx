"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import {
  AdminEmpty,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
  AdminTable,
  AdminTableHead,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin-ui";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type UserRow = {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: "admin" | "member";
  organizationId: string | null;
  organizationName: string | null;
  isActive: number;
  isPlatformAdmin: number;
  createdAt: string;
};

type OrgOption = {
  id: string;
  name: string;
};

const EMPTY_CREATE = {
  firstName: "",
  lastName: "",
  phone: "",
  password: "",
  role: "member" as "admin" | "member",
  organizationId: "" as string,
  isPlatformAdmin: false,
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<{ users: UserRow[] }>("/api/v1/admin/users")
      .then((d) => setRows(d.users))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erreur"));
  }

  useEffect(() => {
    load();
    apiFetch<{ organizations: OrgOption[] }>("/api/v1/admin/organizations")
      .then((d) => setOrgs(d.organizations.map((o) => ({ id: o.id, name: o.name }))))
      .catch(() => setOrgs([]));
  }, []);

  useEffect(() => {
    if (!selected) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync sheet fields when selection changes
    setEditFirstName(selected.firstName);
    setEditLastName(selected.lastName);
    setEditPhone(selected.phone);
    setPassword("");
  }, [selected]);

  const filtered = useMemo(() => {
    const list = rows ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.phone.toLowerCase().includes(q) ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        (u.organizationName ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  async function patch(id: string, body: Record<string, unknown>, success: string) {
    setBusy(true);
    try {
      const { user } = await apiFetch<{ user: UserRow }>(`/api/v1/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      toast.success(success);
      setSelected((prev) => (prev?.id === id ? { ...prev, ...user } : prev));
      load();
      setPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function createUser() {
    if (!createForm.firstName.trim() || !createForm.lastName.trim()) {
      toast.error("Prénom et nom requis");
      return;
    }
    if (!createForm.phone.trim()) {
      toast.error("Téléphone requis");
      return;
    }
    if (createForm.password.length < 8) {
      toast.error("Mot de passe : min. 8 caractères");
      return;
    }
    setBusy(true);
    try {
      await apiFetch<{ user: UserRow }>("/api/v1/admin/users", {
        method: "POST",
        body: JSON.stringify({
          firstName: createForm.firstName.trim(),
          lastName: createForm.lastName.trim(),
          phone: createForm.phone.trim(),
          password: createForm.password,
          role: createForm.role,
          organizationId: createForm.organizationId || null,
          isPlatformAdmin: createForm.isPlatformAdmin ? 1 : 0,
        }),
      });
      toast.success("Utilisateur créé");
      setCreating(false);
      setCreateForm(EMPTY_CREATE);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function saveIdentity() {
    if (!selected) return;
    await patch(
      selected.id,
      {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone.trim(),
      },
      "Profil mis à jour"
    );
  }

  async function deleteUser() {
    if (!selected) return;
    if (selected.id === session?.user?.id) {
      toast.error("Vous ne pouvez pas supprimer votre propre compte");
      return;
    }
    const ok = window.confirm(
      `Supprimer définitivement ${selected.firstName} ${selected.lastName} ? Cette action est irréversible.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/admin/users/${selected.id}`, { method: "DELETE" });
      toast.success("Utilisateur supprimé");
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function accessAccount(user: UserRow) {
    if (user.id === session?.user?.id) {
      toast.error("Vous êtes déjà sur ce compte");
      return;
    }
    if (!user.isActive) {
      toast.error("Ce compte est désactivé");
      return;
    }
    setBusy(true);
    try {
      await update({ impersonateUserId: user.id });
      toast.success(`Connexion au compte de ${user.firstName}`);
      router.push(user.organizationId ? "/app" : "/onboarding");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'accéder au compte");
    } finally {
      setBusy(false);
    }
  }

  if (rows === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full max-w-lg" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Utilisateurs"
        description="Créer, modifier, réinitialiser un mot de passe ou accéder à un compte."
        action={
          <Button onClick={() => setCreating(true)}>Nouvel utilisateur</Button>
        }
      />

      <AdminPanel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur…"
            className="max-w-sm bg-card"
          />
          <p className="text-xs text-muted-foreground">
            {filtered.length} compte{filtered.length > 1 ? "s" : ""}
          </p>
        </div>

        <AdminTable minWidth="48rem">
          <AdminTableHead>
            <tr>
              <AdminTh>Compte</AdminTh>
              <AdminTh>Téléphone</AdminTh>
              <AdminTh>Bar</AdminTh>
              <AdminTh>Rôle</AdminTh>
              <AdminTh>Statut</AdminTh>
            </tr>
          </AdminTableHead>
          <tbody>
            {filtered.map((u) => (
              <AdminTr key={u.id} onClick={() => setSelected(u)}>
                <AdminTd>
                  <p className="font-semibold tracking-tight">
                    {u.firstName} {u.lastName}
                  </p>
                  {u.isPlatformAdmin === 1 ? (
                    <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
                      Super-admin
                    </p>
                  ) : null}
                </AdminTd>
                <AdminTd figures muted>
                  {u.phone}
                </AdminTd>
                <AdminTd>{u.organizationName ?? "—"}</AdminTd>
                <AdminTd muted>
                  {u.organizationId
                    ? u.role === "admin"
                      ? "Gérant"
                      : "Barman"
                    : "Sans bar"}
                </AdminTd>
                <AdminTd>
                  <AdminStatus active={!!u.isActive} />
                </AdminTd>
              </AdminTr>
            ))}
            {filtered.length === 0 ? (
              <AdminEmpty colSpan={5}>Aucun utilisateur trouvé.</AdminEmpty>
            ) : null}
          </tbody>
        </AdminTable>
      </AdminPanel>

      <Sheet
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setCreateForm(EMPTY_CREATE);
        }}
      >
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Nouvel utilisateur</SheetTitle>
            <SheetDescription>Créer un compte depuis le back-office</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-first">Prénom</Label>
                <Input
                  id="create-first"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-last">Nom</Label>
                <Input
                  id="create-last"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <PhoneInput
                value={createForm.phone}
                onChange={(phone) => setCreateForm((f) => ({ ...f, phone }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password">Mot de passe</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 caractères"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bar (optionnel)</Label>
              <Select
                value={createForm.organizationId || "none"}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, organizationId: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun bar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun bar</SelectItem>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createForm.organizationId ? (
              <div className="space-y-1.5">
                <Label>Rôle dans le bar</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(role: "admin" | "member") =>
                    setCreateForm((f) => ({ ...f, role }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Gérant</SelectItem>
                    <SelectItem value="member">Barman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createForm.isPlatformAdmin}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, isPlatformAdmin: e.target.checked }))
                }
              />
              Super-admin plateforme
            </label>
            <Button className="w-full" disabled={busy} onClick={createUser}>
              Créer le compte
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader className="border-b border-border">
                <SheetTitle>
                  {selected.firstName} {selected.lastName}
                </SheetTitle>
                <SheetDescription>{selected.phone}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 overflow-y-auto px-4 py-4">
                <Button
                  className="w-full"
                  disabled={busy || !selected.isActive || selected.id === session?.user?.id}
                  onClick={() => accessAccount(selected)}
                >
                  Accéder à ce compte
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-first">Prénom</Label>
                    <Input
                      id="edit-first"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-last">Nom</Label>
                    <Input
                      id="edit-last"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone</Label>
                  <PhoneInput value={editPhone} onChange={setEditPhone} />
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={
                    busy ||
                    !editFirstName.trim() ||
                    !editLastName.trim() ||
                    !editPhone.trim()
                  }
                  onClick={saveIdentity}
                >
                  Enregistrer le profil
                </Button>

                <div className="space-y-1.5">
                  <Label>Bar</Label>
                  <Select
                    value={selected.organizationId ?? "none"}
                    onValueChange={(v) =>
                      patch(
                        selected.id,
                        { organizationId: v === "none" ? null : v },
                        "Bar mis à jour"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun bar</SelectItem>
                      {orgs.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selected.organizationId ? (
                  <div className="space-y-1.5">
                    <Label>Rôle dans le bar</Label>
                    <Select
                      value={selected.role}
                      onValueChange={(role) =>
                        patch(selected.id, { role }, "Rôle mis à jour")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Gérant</SelectItem>
                        <SelectItem value="member">Barman</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label>Nouveau mot de passe</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 caractères"
                  />
                  <Button
                    disabled={busy || password.length < 8}
                    variant="secondary"
                    className="w-full"
                    onClick={() =>
                      patch(selected.id, { password }, "Mot de passe réinitialisé")
                    }
                  >
                    Réinitialiser le mot de passe
                  </Button>
                </div>

                <div className="flex flex-col gap-2 border-t border-border pt-4">
                  <Button
                    disabled={busy}
                    variant={selected.isPlatformAdmin ? "outline" : "secondary"}
                    onClick={() =>
                      patch(
                        selected.id,
                        { isPlatformAdmin: selected.isPlatformAdmin ? 0 : 1 },
                        selected.isPlatformAdmin
                          ? "Droits plateforme retirés"
                          : "Droits plateforme accordés"
                      )
                    }
                  >
                    {selected.isPlatformAdmin
                      ? "Retirer super-admin"
                      : "Promouvoir super-admin"}
                  </Button>
                  <Button
                    disabled={busy}
                    variant={selected.isActive ? "outline" : "default"}
                    onClick={() =>
                      patch(
                        selected.id,
                        { isActive: selected.isActive ? 0 : 1 },
                        selected.isActive ? "Compte désactivé" : "Compte réactivé"
                      )
                    }
                  >
                    {selected.isActive ? "Désactiver le compte" : "Réactiver le compte"}
                  </Button>
                  <Button
                    disabled={busy || selected.id === session?.user?.id}
                    variant="destructive"
                    onClick={deleteUser}
                  >
                    Supprimer définitivement
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
