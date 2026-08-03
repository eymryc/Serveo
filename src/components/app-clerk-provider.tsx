"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import { useTheme } from "next-themes";

// @clerk/themes n'a pas encore de release stable compatible avec Clerk
// Core 3 (@clerk/nextjs v7) — seulement une canary. On theme donc via
// `variables` uniquement (API stable), avec les couleurs de la charte
// "Comptoir" (cf. globals.css) approximees en hex.
const PALETTE = {
  light: {
    colorPrimary: "#C1622E",
    colorBackground: "#fefcfa",
    colorText: "#2c2622",
    colorTextSecondary: "#756c67",
    colorInputBackground: "#ffffff",
    colorInputText: "#2c2622",
  },
  dark: {
    colorPrimary: "#E08850",
    colorBackground: "#262220",
    colorText: "#f0eeec",
    colorTextSecondary: "#a89f9a",
    colorInputBackground: "#302a27",
    colorInputText: "#f0eeec",
  },
} as const;

export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "dark" ? PALETTE.dark : PALETTE.light;

  return (
    <ClerkProvider
      localization={frFR}
      appearance={{
        variables: { ...colors, borderRadius: "0px" },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
