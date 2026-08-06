"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";

// Clerk parle d'"organisation" partout par defaut — trop generique/SaaS
// pour ce produit. On reecrit vers "etablissement" (deja le terme utilise
// dans le reste de l'app, cf. page d'accueil) sur TOUTE la chaine de
// localisation fr-FR, pas juste les quelques ecrans visibles aujourd'hui :
// Clerk peut afficher d'autres pans (facturation, SSO...) selon la config
// de l'instance, et un remplacement partiel laisserait des ecrans
// incoherents. Regles courtes et ordonnees (accord de genre feminin ->
// masculin traite explicitement) plutot qu'un objet de traduction ecrit a
// la main — plus robuste aux mises a jour du package que de dupliquer
// chaque cle une a une.
const ORGANIZATION_TO_ETABLISSEMENT: [string, string][] = [
  ["une nouvelle organisation", "un nouvel établissement"],
  ["organisation existante", "établissement existant"],
  ["Aucune organisation sélectionnée", "Aucun établissement sélectionné"],
  ["cette organisation", "cet établissement"],
  ["une organisation", "un établissement"],
  ["organisation a été mise", "établissement a été mis"],
  ["mon-organisation", "mon-etablissement"],
  ["Organisations", "Établissements"],
  ["organisations", "établissements"],
  ["Organisation", "Établissement"],
  ["organisation", "établissement"],
];

function withEtablissementWording<T>(localization: T): T {
  let json = JSON.stringify(localization);
  for (const [from, to] of ORGANIZATION_TO_ETABLISSEMENT) {
    json = json.split(from).join(to);
  }
  return JSON.parse(json) as T;
}

const frFrEtablissement = withEtablissementWording(frFR);

// Appearance figee (pas de useTheme ici) : brancher ClerkProvider sur
// resolvedTheme remonte le provider a chaque sync theme / HMR et peut
// faire perdre la session cote client → redirect /sign-in.
// Les couleurs suivent la charte Bouteille light ; les composants Clerk
// du shell (UserButton, etc.) restent lisibles en dark via le CSS app.
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#2F5E4E",
    colorBackground: "#f2f6f4",
    colorText: "#1e322c",
    colorTextSecondary: "#5a7268",
    colorInputBackground: "#ffffff",
    colorInputText: "#1e322c",
    borderRadius: "0px",
    fontFamily: "var(--font-rajdhani), sans-serif",
  },
  elements: {
    cardBox: "shadow-sm",
    card: "shadow-sm",
  },
} as const;

export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={frFrEtablissement} appearance={CLERK_APPEARANCE}>
      {children}
    </ClerkProvider>
  );
}
