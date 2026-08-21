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
    impersonating?: boolean;
    user: {
      id: string;
      phone: string;
      firstName: string;
      lastName: string;
      organizationId: string | null;
      role: "admin" | "member";
      isPlatformAdmin: boolean;
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
        if (!user || user.isActive !== 1) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, phone: user.phone, firstName: user.firstName, lastName: user.lastName };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        delete token.impersonatorId;
      }

      // Impersonation : update({ impersonateUserId }) / update({ stopImpersonating: true })
      if (trigger === "update" && session && typeof session === "object") {
        const payload = session as {
          impersonateUserId?: string;
          stopImpersonating?: boolean;
        };

        const impersonatorId =
          typeof token.impersonatorId === "string" ? token.impersonatorId : undefined;

        if (payload.stopImpersonating && impersonatorId) {
          token.sub = impersonatorId;
          delete token.impersonatorId;
          return token;
        }

        if (payload.impersonateUserId) {
          const actorId = impersonatorId ?? (typeof token.sub === "string" ? token.sub : null);
          if (!actorId) return token;

          const actor = await loadUserById(actorId);
          if (!actor || actor.isPlatformAdmin !== 1 || actor.isActive !== 1) return token;

          const target = await loadUserById(payload.impersonateUserId);
          if (!target || target.isActive !== 1) return token;
          if (target.id === actorId) return token;

          token.impersonatorId = actorId;
          token.sub = target.id;
        }
      }

      return token;
    },
    // Relit l'utilisateur en DB a chaque appel plutot que de faire confiance
    // au JWT — evite toute desynchronisation quand l'org/le role viennent
    // d'etre modifies mais le token cote client n'est pas encore a jour.
    async session({ session, token }) {
      if (!token.sub || typeof token.sub !== "string") return session;

      const user = await loadUserById(token.sub);
      if (!user || user.isActive !== 1) return session;

      const impersonating = typeof token.impersonatorId === "string";

      session.impersonating = impersonating;
      session.user.id = user.id;
      session.user.phone = user.phone;
      session.user.firstName = user.firstName;
      session.user.lastName = user.lastName;
      session.user.organizationId = user.organizationId;
      session.user.role = user.role;
      // Pendant l'impersonation, on se comporte comme le compte cible (pas super-admin).
      session.user.isPlatformAdmin = !impersonating && user.isPlatformAdmin === 1;
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});

async function authFromBearerToken() {
  const authHeader = (await headers()).get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const userId = await verifyMobileToken(authHeader.slice("Bearer ".length));
  if (!userId) return null;

  const user = await loadUserById(userId);
  if (!user || user.isActive !== 1) return null;

  return {
    userId: user.id,
    userName: `${user.firstName} ${user.lastName}`.trim(),
    orgId: user.organizationId,
    orgRole: user.organizationId ? (user.role === "admin" ? ("org:admin" as const) : ("org:member" as const)) : null,
    isPlatformAdmin: user.isPlatformAdmin === 1,
    impersonating: false,
  };
}

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
    isPlatformAdmin: u?.isPlatformAdmin ?? false,
    impersonating: session?.impersonating ?? false,
  };
}
