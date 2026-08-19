import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
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
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const db = getDb();
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    // Relit l'utilisateur en DB a chaque appel plutot que de faire confiance
    // au JWT — evite toute la classe de bugs Clerk ou l'org/le role venaient
    // d'etre modifies mais le token cote client n'etait pas encore a jour
    // (cf. l'ancien /onboarding/sync). auth() est deja memoize par requete
    // par NextAuth, donc ca reste une seule requete DB par navigation.
    async session({ session, token }) {
      if (!token.sub) return session;

      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, token.sub));
      if (!user) return session;

      session.user.id = user.id;
      session.user.email = user.email;
      session.user.name = user.name;
      session.user.organizationId = user.organizationId;
      session.user.role = user.role;
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});

// Compatibilite avec l'ancien auth() de Clerk (meme forme de retour) pour
// que les pages/routes existantes n'aient qu'a changer leur import.
export async function auth() {
  const session = await nextAuthSession();
  const u = session?.user;

  return {
    userId: u?.id ?? null,
    userName: u?.name ?? null,
    userEmail: u?.email ?? null,
    orgId: u?.organizationId ?? null,
    orgRole: u?.organizationId ? (u.role === "admin" ? ("org:admin" as const) : ("org:member" as const)) : null,
  };
}
