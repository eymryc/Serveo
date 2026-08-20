import "server-only";
import { SignJWT, jwtVerify } from "jose";

// Bridge d'authentification pour le client mobile (serveo-mobile) : le web
// utilise un cookie de session NextAuth, mais un client React Native ne peut
// pas s'appuyer de la meme facon sur un cookie de navigateur — on emet donc
// un JWT Bearer autonome, signe avec le meme secret que NextAuth
// (AUTH_SECRET), mais dans un namespace distinct (`aud`) pour ne jamais etre
// confondu avec un token de session NextAuth.
const AUDIENCE = "serveo-mobile";
const MAX_AGE = "30d";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET manquant");
  return new TextEncoder().encode(secret);
}

export async function signMobileToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(MAX_AGE)
    .sign(getSecret());
}

export async function verifyMobileToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: AUDIENCE });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
