"use client";

import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.14),_transparent_40%)]" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">
            Next Messenger
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in or create an account to continue.
          </p>
        </div>

        {children}

        <p className="mt-8 text-center text-xs text-zinc-500">
          By continuing, you agree to our terms and privacy policy.
        </p>
        <div className="mt-3 text-center text-xs text-zinc-500">
          <Link href="/" className="hover:text-zinc-300 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
