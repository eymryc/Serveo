"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";

/** Pages statut (404 / erreur) — même ambiance que le parcours auth. */
export function AuthStatusShell({
  eyebrow,
  title,
  description,
  primary,
  secondary,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primary: { href?: string; label: string; onClick?: () => void };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <Image
        src="/login-register.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[58%_42%]"
        aria-hidden
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(160deg,rgba(5,9,7,0.9)_0%,rgba(5,9,7,0.72)_50%,rgba(5,9,7,0.88)_100%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex h-16 items-center px-5 pt-safe sm:px-10">
          <Link href="/" className="transition-opacity hover:opacity-85">
            <LogoMark size="md" priority className="brightness-0 invert" />
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-5 pb-16">
          <div className="auth-reveal w-full max-w-md text-center">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-[#9fd4b8] uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-[clamp(1.9rem,5vw,2.6rem)] font-bold tracking-[-0.03em] text-white">
              {title}
            </h1>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-white/75">
              {description}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              {primary.href ? (
                <Button
                  size="lg"
                  className="h-12 min-w-[10rem] bg-white px-7 text-[oklch(0.28_0.06_160)] hover:bg-white/92"
                  asChild
                >
                  <Link href={primary.href}>{primary.label}</Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="h-12 min-w-[10rem] bg-white px-7 text-[oklch(0.28_0.06_160)] hover:bg-white/92"
                  onClick={primary.onClick}
                >
                  {primary.label}
                </Button>
              )}
              {secondary ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/55 bg-transparent px-7 text-white hover:bg-white/12 hover:text-white"
                  asChild
                >
                  <Link href={secondary.href}>{secondary.label}</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
