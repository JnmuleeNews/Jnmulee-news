"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function WorkerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkWorkerSession();
  }, []);

  async function checkWorkerSession() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const role = user.app_metadata?.role;

    /*
     * Only automatically redirect an existing WORKER.
     *
     * Do NOT redirect an existing admin session to /admin.
     * The user may be trying to switch from the admin account
     * to a worker account in the same browser.
     */
    if (role === "worker") {
      window.location.replace("/worker");
    }
  }

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !password) {
        setError("Enter your email and password.");
        setLoading(false);
        return;
      }

      /*
       * Sign in with the worker credentials.
       *
       * Supabase will replace the current browser session
       * with this account's session.
       */
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

      if (!data.user) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      const role = data.user.app_metadata?.role;

      if (role !== "worker") {
        await supabase.auth.signOut();

        if (role === "admin") {
          setError(
            "This account is an administrator account. Use a worker account to enter the Worker Dashboard."
          );
        } else {
          setError(
            "This account does not have worker access."
          );
        }

        setLoading(false);
        return;
      }

      /*
       * Confirm the browser has the new session.
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          "The worker session could not be created. Please try again."
        );
        setLoading(false);
        return;
      }

      /*
       * Worker authentication is successful.
       */
      window.location.replace("/worker");
    } catch (err) {
      console.error(err);

      setError(
        "Unable to sign in. Please try again."
      );

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
              <span className="text-white">
                JNMulee
              </span>{" "}
              <span className="text-cyan-400">
                News
              </span>
            </Link>

            <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-cyan-400" />
          </div>

          <div className="mb-7">
            <div className="mb-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold tracking-wide text-cyan-300">
              WORKER ACCESS
            </div>

            <h1 className="text-2xl font-black">
              Worker Login
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Sign in to create and manage your own posts.
            </p>
          </div>

          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Worker Email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Worker email"
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
            Worker Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Worker password"
            autoComplete="current-password"
            required
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-60"
          />

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-3.5 font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Signing in..."
              : "Sign in as Worker"}
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