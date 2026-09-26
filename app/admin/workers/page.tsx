"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [signingIn, setSigningIn] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function checkExistingUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted || !user) {
          setLoading(false);
          return;
        }

        const role =
          user.app_metadata?.role;

        if (role === "admin") {
          window.location.replace(
            "/admin"
          );
          return;
        }

        if (role === "worker") {
          const bannedUntil =
            user.banned_until;

          if (
            bannedUntil &&
            new Date(
              bannedUntil
            ).getTime() >
              Date.now()
          ) {
            await supabase.auth.signOut();

            if (mounted) {
              setError(
                "This worker account is currently disabled."
              );
              setLoading(false);
            }

            return;
          }

          window.location.replace(
            "/worker"
          );
          return;
        }

        await supabase.auth.signOut();

        if (mounted) {
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkExistingUser();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSigningIn(true);

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(
        "Enter your email address."
      );
      setSigningIn(false);
      return;
    }

    if (!password) {
      setError(
        "Enter your password."
      );
      setSigningIn(false);
      return;
    }

    try {
      /*
       * Clear any stale session first.
       * This helps prevent an old admin/worker
       * session from causing a redirect loop.
       */
      await supabase.auth.signOut();

      const {
        data,
        error: signInError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: cleanEmail,
            password,
          }
        );

      if (
        signInError ||
        !data.user
      ) {
        throw new Error(
          signInError?.message ||
            "Invalid email or password."
        );
      }

      /*
       * Read the authenticated user returned
       * by Supabase after successful login.
       */
      const {
        data: userData,
        error:
          userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        await supabase.auth.signOut();

        throw new Error(
          "Unable to verify your account."
        );
      }

      const user =
        userData.user;

      const role =
        user.app_metadata?.role;

      /*
       * ADMIN
       */
      if (role === "admin") {
        window.location.replace(
          "/admin"
        );
        return;
      }

      /*
       * WORKER
       */
      if (role === "worker") {
        const bannedUntil =
          user.banned_until;

        if (
          bannedUntil &&
          new Date(
            bannedUntil
          ).getTime() >
            Date.now()
        ) {
          await supabase.auth.signOut();

          throw new Error(
            "This worker account is currently disabled. Contact the administrator."
          );
        }

        window.location.replace(
          "/worker"
        );
        return;
      }

      /*
       * No recognized staff role.
       */
      await supabase.auth.signOut();

      throw new Error(
        "This account does not have permission to access the staff area."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in."
      );
      setSigningIn(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

          <p className="text-sm font-semibold text-slate-400">
            Checking staff session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">

        {/* BRAND */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10">
            <span className="text-2xl font-black text-cyan-300">
              JN
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight">
            JNMulee News
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Staff login
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl sm:p-8">

          <div className="mb-6">
            <h2 className="text-xl font-black">
              Sign in
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Admins and authorized workers can sign in here.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-bold text-slate-200"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="you@example.com"
                disabled={signingIn}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-bold text-slate-200"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Your password"
                disabled={signingIn}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={signingIn}
              className="w-full rounded-xl bg-cyan-400 px-5 py-3.5 font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {signingIn
                ? "Signing in..."
                : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Authorized JNMulee News staff only.
        </p>
      </div>
    </main>
  );
}