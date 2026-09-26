"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Permissions = {
  can_import?: boolean;
  can_write?: boolean;
  can_publish?: boolean;
  can_manage_comments?: boolean;
};

type WorkerProfile = {
  display_name: string;
  permissions: Permissions;
  active: boolean;
};

export default function WorkerDashboard() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<WorkerProfile | null>(null);

  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    checkWorker();
  }, []);

  async function checkWorker() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const role =
        user.app_metadata?.role;

      if (role !== "worker") {
        if (role === "admin") {
          router.replace("/admin");
        } else {
          await supabase.auth.signOut();
          router.replace("/admin/login");
        }

        return;
      }

      if (
        user.banned_until &&
        new Date(
          user.banned_until
        ).getTime() > Date.now()
      ) {
        await supabase.auth.signOut();

        setError(
          "Your worker account is currently disabled."
        );

        setTimeout(() => {
          router.replace("/admin/login");
        }, 1500);

        return;
      }

      setEmail(user.email || "");

      /*
       * Worker permissions are stored in the
       * worker_profiles table and protected by
       * RLS, so we use the worker API to retrieve
       * the profile.
       */
      const {
        data: sessionData,
      } = await supabase.auth.getSession();

      const token =
        sessionData.session?.access_token;

      if (!token) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      const response =
        await fetch(
          "/api/admin/workers/me",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

      /*
       * The /me endpoint may not exist yet.
       * In that case we still allow the worker
       * dashboard to load with safe default
       * permissions until the endpoint is added.
       */
      if (response.ok) {
        const result =
          await response.json();

        if (result.worker) {
          setProfile({
            display_name:
              result.worker.display_name ||
              user.user_metadata?.display_name ||
              "Worker",
            permissions:
              result.worker.permissions ||
              {},
            active:
              result.worker.active !== false,
          });

          if (
            result.worker.active === false
          ) {
            await supabase.auth.signOut();

            setError(
              "Your worker account is disabled."
            );

            setTimeout(() => {
              router.replace(
                "/admin/login"
              );
            }, 1500);

            return;
          }
        } else {
          setProfile({
            display_name:
              user.user_metadata?.display_name ||
              "Worker",
            permissions: {},
            active: true,
          });
        }
      } else {
        setProfile({
          display_name:
            user.user_metadata?.display_name ||
            "Worker",
          permissions: {},
          active: true,
        });
      }
    } catch {
      setError(
        "Unable to load your worker account."
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoggingOut(true);

    await supabase.auth.signOut();

    window.location.replace(
      "/admin/login"
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

          <p className="text-sm font-semibold text-slate-400">
            Loading worker dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <h1 className="text-xl font-black">
            Access unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {error}
          </p>

          <button
            onClick={() =>
              router.replace(
                "/admin/login"
              )
            }
            className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950 hover:bg-cyan-300"
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  const permissions =
    profile?.permissions || {};

  const permissionCards = [
    {
      key: "can_import",
      title: "Import News",
      description:
        "Import news from configured sources.",
      enabled:
        permissions.can_import === true,
      href: "/admin",
    },
    {
      key: "can_write",
      title: "Write Articles",
      description:
        "Create and edit news articles.",
      enabled:
        permissions.can_write === true,
      href: "/admin",
    },
    {
      key: "can_publish",
      title: "Publish",
      description:
        "Publish approved articles.",
      enabled:
        permissions.can_publish === true,
      href: "/admin",
    },
    {
      key: "can_manage_comments",
      title: "Comments",
      description:
        "Review and manage comments.",
      enabled:
        permissions.can_manage_comments === true,
      href: "/admin",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-black text-cyan-300">
                JN
              </div>

              <div>
                <h1 className="font-black">
                  JNMulee News
                </h1>

                <p className="text-xs text-slate-500">
                  Worker Dashboard
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            disabled={loggingOut}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-50"
          >
            {loggingOut
              ? "Signing out..."
              : "Sign Out"}
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* WELCOME */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-cyan-400">
            Worker Account
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Welcome,{" "}
            {profile?.display_name ||
              "Worker"}
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {email}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Account Active
          </div>
        </section>

        {/* PERMISSIONS */}
        <section>
          <div className="mb-5">
            <h3 className="text-xl font-black">
              Your Permissions
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              These are the tasks your administrator has assigned to you.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {permissionCards.map(
              (permission) => (
                <div
                  key={permission.key}
                  className={`rounded-2xl border p-5 ${
                    permission.enabled
                      ? "border-cyan-400/20 bg-slate-900"
                      : "border-slate-800 bg-slate-900/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-black">
                      {permission.title}
                    </h4>

                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                        permission.enabled
                          ? "bg-cyan-400/10 text-cyan-300"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {permission.enabled
                        ? "Allowed"
                        : "Off"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {
                      permission.description
                    }
                  </p>

                  {permission.enabled && (
                    <button
                      onClick={() =>
                        router.push(
                          permission.href
                        )
                      }
                      className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
                    >
                      Open
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        </section>

        {/* STATUS */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="font-black">
            Account Information
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            <div className="rounded-xl bg-slate-950 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Role
              </p>

              <p className="mt-1 font-bold text-cyan-300">
                Worker
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Status
              </p>

              <p className="mt-1 font-bold text-cyan-300">
                Active
              </p>
            </div>

          </div>
        </section>

        {/* NOTICE */}
        <section className="mt-8 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-6">
          <h3 className="font-black text-cyan-300">
            JNMulee News Staff
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Your access is controlled by the administrator.
            Only the permissions assigned to your account
            should be used. If you need additional access,
            contact the administrator.
          </p>
        </section>

      </div>
    </main>
  );
}