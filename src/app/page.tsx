import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  GlassWater,
  Lock,
  Users,
  WifiOff,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  {
    icon: WifiOff,
    title: "Fonctionne meme sans reseau",
    description:
      "Le vendredi soir, quand le reseau mobile sature, la saisie des ventes continue. Tout se synchronise automatiquement au retour de la connexion.",
  },
  {
    icon: Lock,
    title: "Ventes et stock relies automatiquement",
    description:
      "Chaque vente decremente le stock dans la meme transaction — plus de double saisie, plus d'ecart entre ce qui est vendu et ce qui reste en rayon.",
  },
  {
    icon: Users,
    title: "Le barman ne voit pas la marge du bar",
    description:
      "Gerant et barman ont des acces distincts : saisie des ventes et stock pour l'un, chiffre d'affaires et charges reserves a l'autre.",
  },
  {
    icon: LayoutDashboard,
    title: "Un tableau de bord qui ne ment pas",
    description:
      "CA et charges compares sur la meme periode, alertes de stock par article, objectif du mois — pas de pourcentages fictifs.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-etablissements, isoles",
    description:
      "Chaque bar est un espace independant. Les donnees d'un etablissement ne se melangent jamais avec celles d'un autre.",
  },
  {
    icon: GlassWater,
    title: "Pense pour le comptoir",
    description:
      "Saisie rapide, gros boutons, FCFA natif, Orange Money / MTN MoMo / Wave — construit pour l'usage reel d'un bar ouest-africain.",
  },
];

export default async function LandingPage() {
  const { userId, orgId } = await auth();

  if (userId && orgId) redirect("/app");
  if (userId && !orgId) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GlassWater className="size-4" />
            </span>
            BarPilot
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Se connecter</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Creer mon bar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <p className="mb-4 inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            Logiciel de gestion pour bars &amp; buvettes
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Le comptoir, <span className="text-primary">sous controle</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            Ventes, stock et charges en temps reel — sans double saisie, sans dependre d&apos;une
            connexion parfaite, et sans que le barman ne voie la marge du bar.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Creer mon bar <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sign-in">Se connecter</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="border-border">
                <CardContent className="pt-2">
                  <span className="mb-3 flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <feature.icon className="size-4.5" />
                  </span>
                  <h3 className="font-medium text-foreground">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        BarPilot — FCFA · Orange Money · MTN MoMo · Wave
      </footer>
    </div>
  );
}
