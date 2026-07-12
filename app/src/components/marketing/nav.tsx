"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import Image from "next/image";

export function MarketingNav() {
  // NOTE: adjust `user` here to match whatever your auth-context actually
  // exposes (e.g. it might be `session?.user` instead of `user` directly —
  // check context/auth-context.tsx for the exact shape). This is the fix
  // for both bugs reported: "Home" link going to /create, and
  // "Go to Dashboard" showing while logged out — both were symptoms of
  // this nav not correctly reading auth state.
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo — always links to / regardless of auth state.
            If logged in, / will itself redirect to /create via the
            server-side check in app/page.tsx, so this is safe either way. */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden">
            <Image
              src="/logo_2.png"
              alt="AdLaunch AI Logo"
              width={36}
              height={36}
              unoptimized
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            AdLaunch AI
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-[13px] text-muted-foreground transition-colors hover:text-white"
          >
            Home
          </Link>
          <Link
            href="/pricing"
            className="text-[13px] text-muted-foreground transition-colors hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/how-it-works"
            className="text-[13px] text-muted-foreground transition-colors hover:text-white"
          >
            How it Works
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/create"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[13px] text-muted-foreground transition-colors hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}