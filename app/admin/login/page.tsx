"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkExistingSession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (user?.app_metadata?.role === "admin") {
          window.location.replace("/admin");
        }
      } catch {
        // Stay on login page.
      }
    }

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      const user = data.user;

      if (!user) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Check the secure app_metadata admin role.
      if (user.app_metadata?.role !== "admin") {
        await supabase.auth.signOut();

        setError(
          "This account does not have administrator access."
        );

        setLoading(false);
        return;
      }

      /*
       * Give Supabase a moment to finish writing the
       * authentication cookies before navigating.
       */
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Full browser navigation prevents the client-side
      // router from creating an authentication redirect loop.
      window.location.replace("/admin");
    } catch {
      setError("Unable to sign in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="flex min-h-[80vh] items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-7 shadow-2xl sm:p-9"
        >
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="text-3xl font-black tracking-tight"
            >
              <span className="text-white">JNMulee</span>{" "}
              <span className="text-cyan-400">News</span>
            </Link>

            <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-cyan-400" />
          </div>

          <div className="mb-7">
            <div className="mb-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold tracking-wide text-cyan-300">
              ADMINISTRATION
            </div>

            <h1 className="text-2xl font-black">
              Admin Login
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Sign in to manage JNMulee News.
            </p>
          </div>

          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Admin email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            disabled={loading}
            className="mb-5 w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-60"
          />

          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Admin password"
            autoComplete="current-password"
            required
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-60"
          />

          {error && (
            <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-3.5 font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <Link
            href="/"
            className="mt-6 block text-center text-sm font-semibold text-slate-500 hover:text-cyan-300"
          >
            ← Back to website
          </Link>
        </form>
      </div>
    </main>
  );
}