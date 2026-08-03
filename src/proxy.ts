import { clerkMiddleware } from "@clerk/nextjs/server";

// Volontairement minimal : les verifications d'auth (signe-in, organisation
// active) vivent au niveau de chaque layout/page/route (cf. lib/tenant.ts et
// app/(app)/app/layout.tsx), pas ici. Le matching par middleware est
// deprecie par Clerk car il peut diverger du routing reel de Next.js.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
