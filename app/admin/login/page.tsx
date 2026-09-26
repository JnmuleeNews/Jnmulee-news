"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (user) {
          const role = user.app_metadata?.role;

          if (role === "admin") {
            router.replace("/admin");
            return;
          }

          await supabase.auth.signOut();
        }
      } catch {
        // Stay on login page if session checking fails.
      }

      if (mounted) {
        setCheckingSession(false);
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      setLoading(false);
      return;
    }

    try {
      const {
        data,
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        setError(
          signInError.message || "Invalid email or password."
        );
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError(
          "Sign-in was not completed. Please try again."
        );
        setLoading(false);
        return;
      }

      const role = data.user.app_metadata?.role;

      if (role !== "admin") {
        await supabase.auth.signOut();

        setError(
          "This account does not have administrator access."
        );
        setLoading(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 150));

      router.replace("/admin");
      router.refresh();
    } catch {
      setError(
        "Unable to sign in right now. Please try again."
      );
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-8 shadow-2xl shadow-black/40">
            <Link
              href="/"
              className="mb-8 block text-center text-2xl font-black tracking-tight"
            >
              <span className="text-white">JNMulee</span>{" "}
              <span className="text-cyan-400">News</span>
            </Link>

            <div className="flex flex-col items-center py-8">
              <div className="mb-5 h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />

              <p className="text-center text-sm text-slate-400">
                Checking your session...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="flex min-h-[80vh] items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-7 shadow-2xl shadow-black/40 sm:p-9"
        >
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="inline-block text-3xl font-black tracking-tight"
            >
              <span className="text-white">JNMulee</span>{" "}
              <span className="text-cyan-400">News</span>
            </Link>

            <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/30" />
          </div>

          <div className="mb-7">
            <div className="mb-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold tracking-wide text-cyan-300">
              ADMINISTRATION
            </div>

            <h1 className="text-2xl font-black tracking-tight">
              Admin Login
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Sign in to access the JNMulee News administration
              area.
            </p>
          </div>

          <label
            htmlFor="admin-email"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Email
          </label>

          <input
            id="admin-email"
            name="email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            disabled={loading}
            className="mb-5 w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <label
            htmlFor="admin-password"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Password
          </label>

          <input
            id="admin-password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          />

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm leading-6 text-cyan-200"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-3.5 font-black text-slate-950 shadow-lg shadow-cyan-400/10 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <Link
            href="/"
            className="mt-6 block text-center text-sm font-semibold text-slate-500 transition hover:text-cyan-300"
          >
            ← Back to website
          </Link>
        </form>
      </div>
    </main>
  );
}