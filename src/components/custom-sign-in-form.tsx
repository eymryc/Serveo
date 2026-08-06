"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

const REDIRECT_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL ?? "/onboarding";
const SSO_CALLBACK_URL = "/sign-in/sso-callback";

type PasswordView = "signin" | "forgot-email" | "forgot-verify";

export function CustomSignInForm() {
  const { signIn } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [passwordView, setPasswordView] = useState<PasswordView>("signin");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finalizeIfComplete() {
    if (signIn.status === "complete") {
      await signIn.finalize({ navigate: () => router.push(REDIRECT_URL) });
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    const { error: signInError } = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl: SSO_CALLBACK_URL,
      redirectCallbackUrl: REDIRECT_URL,
    });
    if (signInError) {
      setError(signInError.longMessage ?? signInError.message);
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await signIn.password({ identifier: email, password });
    if (signInError) {
      setError(signInError.longMessage ?? signInError.message);
    } else {
      await finalizeIfComplete();
    }
    setLoading(false);
  }

  async function handleSendCode(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await signIn.emailCode.sendCode({ emailAddress: email });
    if (signInError) {
      setError(signInError.longMessage ?? signInError.message);
    } else {
      setCodeSent(true);
    }
    setLoading(false);
  }

  async function handleVerifyCode(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await signIn.emailCode.verifyCode({ code });
    if (signInError) {
      setError(signInError.longMessage ?? signInError.message);
    } else {
      await finalizeIfComplete();
    }
    setLoading(false);
  }

  async function handleForgotPasswordRequest(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: createError } = await signIn.create({ identifier: email });
    if (createError) {
      setError(createError.longMessage ?? createError.message);
      setLoading(false);
      return;
    }
    const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendError) {
      setError(sendError.longMessage ?? sendError.message);
    } else {
      setPasswordView("forgot-verify");
    }
    setLoading(false);
  }

  async function handleForgotPasswordSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (verifyError) {
      setError(verifyError.longMessage ?? verifyError.message);
      setLoading(false);
      return;
    }
    const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({
      password: newPassword,
    });
    if (submitError) {
      setError(submitError.longMessage ?? submitError.message);
    } else {
      await finalizeIfComplete();
    }
    setLoading(false);
  }

  function resetToSignIn() {
    setError(null);
    setCode("");
    setNewPassword("");
    setPasswordView("signin");
  }

  return (
    <div className="relative w-full space-y-4 overflow-hidden rounded-md border border-border bg-card p-6 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={loading}
        onClick={handleGoogleSignIn}
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23Z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.85Z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.85C6.71 7.3 9.14 5.38 12 5.38Z"
          />
        </svg>
        Continuer avec Google
      </Button>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        ou
        <div className="h-px flex-1 bg-border" />
      </div>

      <Tabs
        defaultValue="password"
        onValueChange={() => {
          setError(null);
          setCodeSent(false);
          setCode("");
          resetToSignIn();
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="password" className="flex-1">
            Mot de passe
          </TabsTrigger>
          <TabsTrigger value="code" className="flex-1">
            Code par email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="password">
          {passwordView === "signin" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email-password">Email</Label>
                <Input
                  id="email-password"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    onClick={() => {
                      setError(null);
                      setPasswordView("forgot-email");
                    }}
                  >
                    Mot de passe oublie ?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          )}

          {passwordView === "forgot-email" && (
            <form onSubmit={handleForgotPasswordRequest} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Recevez un code pour reinitialiser votre mot de passe.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Envoi..." : "Envoyer le code"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={resetToSignIn}>
                Retour
              </Button>
            </form>
          )}

          {passwordView === "forgot-verify" && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
              <p className="text-sm text-muted-foreground">Code envoye a {email}</p>
              <div className="space-y-1.5">
                <Label htmlFor="forgot-code">Code de verification</Label>
                <Input
                  id="forgot-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Validation..." : "Reinitialiser et se connecter"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={resetToSignIn}>
                Retour
              </Button>
            </form>
          )}
        </TabsContent>

        <TabsContent value="code">
          {!codeSent ? (
            <form onSubmit={handleSendCode} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email-code">Email</Label>
                <Input
                  id="email-code"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Envoi..." : "Envoyer le code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <p className="text-sm text-muted-foreground">Code envoye a {email}</p>
              <div className="space-y-1.5">
                <Label htmlFor="code">Code de verification</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verification..." : "Valider"}
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
