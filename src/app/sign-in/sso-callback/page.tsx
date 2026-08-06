"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Route litterale (pas dans le catch-all [[...sign-in]]) : Google redirige
// ici apres l'autorisation OAuth. Ce composant Clerk termine le sign-in/
// sign-up et redirige vers les *_FORCE_REDIRECT_URL configures en env.
export default function SsoCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}
