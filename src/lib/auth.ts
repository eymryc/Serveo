import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { verifyMobileToken } from "@/lib/mobile-token";

async function loadUserById(userId: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user ?? null;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      phone: string;
      firstName: string;
      lastName: string;
      organizationId: string | null;
      role: "admin" | "member";
    };
  }
}

export const { handlers, signIn, signOut, auth: nextAuthSession } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: {
        phone: { label: "Numero de telephone", type: "tel" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const phone = String(credentials?.phone ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!phone || !password) return null;

        const db = getDb();
        const [user] = await db.select().from(users).where(eq(users.phone, phone));
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, phone: user.phone, firstName: user.firstName, lastName: user.lastName };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    // Relit l'utilisateur en DB a chaque appel plutot que de faire confiance
    // au JWT — evite toute desynchronisation quand l'org/le role viennent
    // d'etre modifies mais le token cote client n'est pas encore a jour.
    // auth() est deja memoize par requete par NextAuth, donc ca reste une
    // seule requete DB par navigation.
    async session({ session, token }) {
      if (!token.sub) return session;

      const user = await loadUserById(token.sub);
      if (!user) return session;

      session.user.id = user.id;
      session.user.phone = user.phone;
      session.user.firstName = user.firstName;
      session.user.lastName = user.lastName;
      session.user.organizationId = user.organizationId;
      session.user.role = user.role;
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});

// Le client mobile ne peut pas s'appuyer sur le cookie de session NextAuth
// comme le web : il envoie un Bearer token autonome (cf. lib/mobile-token.ts
// et POST /api/v1/auth/login) verifie ici en priorite. Sans en-tete
// Authorization (cas du web), on retombe sur la session NextAuth normale.
async function authFromBearerToken() {
  const authHeader = (await headers()).get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const userId = await verifyMobileToken(authHeader.slice("Bearer ".length));
  if (!userId) return null;

  const user = await loadUserById(userId);
  if (!user) return null;

  return {
    userId: user.id,
    userName: `${user.firstName} ${user.lastName}`.trim(),
    orgId: user.organizationId,
    orgRole: user.organizationId ? (user.role === "admin" ? ("org:admin" as const) : ("org:member" as const)) : null,
  };
}

// Forme de retour stable consommee par les pages/routes existantes
// (userId/orgId/orgRole), independante du provider d'auth sous-jacent.
export async function auth() {
  const bearer = await authFromBearerToken();
  if (bearer) return bearer;

  const session = await nextAuthSession();
  const u = session?.user;

  return {
    userId: u?.id ?? null,
    userName: u ? `${u.firstName} ${u.lastName}`.trim() : null,
    orgId: u?.organizationId ?? null,
    orgRole: u?.organizationId ? (u.role === "admin" ? ("org:admin" as const) : ("org:member" as const)) : null,
  };
}
