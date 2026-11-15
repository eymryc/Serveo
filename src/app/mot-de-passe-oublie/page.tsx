import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";

function supportWhatsAppHref() {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim() ?? "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const text = encodeURIComponent(
    "Bonjour Serveo, j’ai oublié le mot de passe de mon compte gérant. Mon numéro : "
  );
  return `https://wa.me/${digits}?text=${text}`;
}

export default async function ForgotPasswordPage() {
  const { userId, orgId, isPlatformAdmin } = await auth();

  if (userId && orgId) redirect("/app");
  if (userId && isPlatformAdmin) redirect("/admin");
  if (userId && !orgId) redirect("/onboarding");

  const whatsapp = supportWhatsAppHref();

  return (
    <AuthShell
      active="forgot"
      title="Mot de passe oublié"
      description="Pas d’e-mail sur Serveo : le compte est lié au téléphone. Voici comment récupérer l’accès."
      footer={
        <p className="text-sm text-muted-foreground">
          Vous vous souvenez du mot de passe ?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Se connecter
          </Link>
        </p>
      }
    >
      <div className="space-y-6">
        <section className="space-y-2 border-b border-border/60 pb-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
            01 · Barman
          </p>
          <h2 className="text-[1.05rem] font-bold tracking-tight text-foreground">
            Demandez à votre gérant
          </h2>
          <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
            Dans Serveo → Équipe, le gérant peut redéfinir votre mot de passe
            temporaire. Il vous le communique, vous vous reconnectez tout de suite.
          </p>
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
            02 · Gérant
          </p>
          <h2 className="text-[1.05rem] font-bold tracking-tight text-foreground">
            Contactez le support Serveo
          </h2>
          <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
            Indiquez le numéro de téléphone du compte. Après vérification, on
            réinitialise le mot de passe depuis le back-office.
          </p>
          {whatsapp ? (
            <Button size="lg" className="auth-submit h-12 w-full text-[15px] tracking-wide" asChild>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                Écrire sur WhatsApp
              </a>
            </Button>
          ) : (
            <p className="rounded-md border border-border/70 bg-muted/40 px-3 py-3 text-[0.9rem] leading-relaxed text-muted-foreground">
              Contactez le support Serveo avec le numéro du compte. Un agent
              réinitialisera le mot de passe après vérification.
            </p>
          )}
        </section>
      </div>
    </AuthShell>
  );
}
