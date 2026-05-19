"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, email, password }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(data?.error || "Something went wrong. Please try again.");
      return;
    }

    router.push("/login");
  }

  return (
    <>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm text-zinc-300">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-indigo-400 transition focus:border-indigo-400/60 focus:ring-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="username" className="text-sm text-zinc-300">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="janedoe"
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-indigo-400 transition focus:border-indigo-400/60 focus:ring-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-zinc-300">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-indigo-400 transition focus:border-indigo-400/60 focus:ring-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-zinc-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a secure password"
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-indigo-400 transition focus:border-indigo-400/60 focus:ring-2"
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-indigo-300 transition hover:text-indigo-200"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
