import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const { userId, orgId } = await auth();

  if (userId && orgId) redirect("/app");
  if (userId && !orgId) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 p-4 text-center">
      <h1 className="text-3xl font-bold text-neutral-900">BarPilot</h1>
      <p className="max-w-md text-neutral-600">
        Ventes, stock et charges pour bars et buvettes — en temps reel, sans double saisie.
      </p>
      <div className="flex gap-3">
        <Link
          href="/sign-up"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Creer mon bar
        </Link>
        <Link
          href="/sign-in"
          className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
}
