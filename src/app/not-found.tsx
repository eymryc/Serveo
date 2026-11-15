"use client";

import { AuthStatusShell } from "@/components/auth-status-shell";

export default function NotFoundPage() {
  return (
    <AuthStatusShell
      eyebrow="404"
      title="Page introuvable"
      description="Cette adresse n’existe pas ou a été déplacée."
      primary={{ href: "/", label: "Retour à l’accueil" }}
      secondary={{ href: "/sign-in", label: "Se connecter" }}
    />
  );
}
