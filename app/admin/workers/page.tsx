"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Worker = {
  user_id: string;
  email: string | null;
  display_name: string;
  active: boolean;
  permissions: {
    create_post?: boolean;
    edit_own_posts?: boolean;
    publish_own_posts?: boolean;
    save_drafts?: boolean;
  };
  created_at: string | null;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10";

const buttonClass =
  "rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-400/10 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-2.5 text-sm font-bold text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:opacity-50";

export default function WorkersAdminPage() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [workers, setWorkers] = useState<Worker[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(true);

  const clearNotice = () => {
    setMessage("");
    setError("");
  };

  const getToken = async () => {
    const {
      data,
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    const token = data.session?.access_token;

    if (!token) {
      throw new Error(
        "Your admin session has expired. Please sign in again."
      );
    }

    return token;
  };

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        window.location.replace("/admin/login");
        return;
      }

      if (user.app_metadata?.role !== "admin") {
        setError(
          "You do not have administrator access."
        );
        return;
      }

      const token = await getToken();

      const response = await fetch(
        "/api/admin/workers",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to load workers."
        );
      }

      setWorkers(
        Array.isArray(data.workers)
          ? data.workers
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load workers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  async function createWorker() {
    clearNotice();

    if (!name.trim()) {
      setError("Enter the worker's name.");
      return;
    }

    if (!email.trim()) {
      setError("Enter the worker's email.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Worker password must be at least 8 characters."
      );
      return;
    }

    setWorking(true);

    try {
      const token = await getToken();

      const response = await fetch(
        "/api/admin/workers",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            display_name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to create worker."
        );
      }

      setName("");
      setEmail("");
      setPassword("");

      setMessage(
        "Worker account created successfully."
      );

      await loadWorkers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create worker."
      );
    } finally {
      setWorking(false);
    }
  }

  async function toggleWorker(worker: Worker) {
    clearNotice();
    setWorking(true);

    try {
      const token = await getToken();

      const response = await fetch(
        "/api/admin/workers",
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            user_id: worker.user_id,
            active: !worker.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to update worker."
        );
      }

      setMessage(
        worker.active
          ? "Worker account disabled."
          : "Worker account enabled."
      );

      await loadWorkers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update worker."
      );
    } finally {
      setWorking(false);
    }
  }

  async function deleteWorker(worker: Worker) {
    const confirmed = window.confirm(
      `Delete worker "${worker.display_name}"? This will permanently remove the worker account.`
    );

    if (!confirmed) {
      return;
    }

    clearNotice();
    setWorking(true);

    try {
      const token = await getToken();

      const response = await fetch(
        "/api/admin/workers",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            user_id: worker.user_id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to delete worker."
        );
      }

      setMessage("Worker account deleted.");

      await loadWorkers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete worker."
      );
    } finally {
      setWorking(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/admin/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />

          <p className="text-slate-300">
            Loading Workers...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-slate-900 to-cyan-950/30 p-5 shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />

                <span className="text-sm font-black text-cyan-300">
                  JNMulee News
                </span>
              </div>

              <h1 className="mt-1 text-3xl font-black">
                Workers
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Create and manage staff accounts.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/admin"
                className={secondaryButton}
              >
                Admin Dashboard
              </a>

              <a
                href="/worker/login"
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryButton}
              >
                Worker Login
              </a>

              <button
                type="button"
                onClick={signOut}
                className={secondaryButton}
              >
                Sign Out
              </button>
            </div>

          </div>
        </header>

        {message && (
          <div className="mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm font-semibold text-cyan-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-cyan-400/20 bg-slate-900 p-4 text-sm text-cyan-100">
            <span className="font-bold text-cyan-300">
              Notice:
            </span>{" "}
            {error}
          </div>
        )}

        <section className="mb-8 overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.07] to-white/[0.02] shadow-xl">

          <button
            type="button"
            onClick={() =>
              setShowCreate(!showCreate)
            }
            className="flex w-full items-center justify-between p-5 text-left"
          >
            <div>
              <p className="text-xs font-bold tracking-widest text-cyan-400">
                STAFF MANAGEMENT
              </p>

              <h2 className="mt-1 text-xl font-black">
                Create Worker Account
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Create a staff account with limited news-management access.
              </p>
            </div>

            <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-sm font-bold text-cyan-200">
              {showCreate ? "Hide" : "Create"}
            </span>
          </button>

          {showCreate && (
            <div className="border-t border-white/10 p-5">

              <div className="grid gap-4 md:grid-cols-3">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Worker Name
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="John Staff"
                    className={inputClass}
                    disabled={working}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Worker Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="worker@example.com"
                    className={inputClass}
                    disabled={working}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Temporary Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="At least 8 characters"
                    className={inputClass}
                    disabled={working}
                  />
                </div>

              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-sm font-bold text-cyan-300">
                  Worker permissions
                </p>

                <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                  <span>✓ Create Post</span>
                  <span>✓ Edit Own Posts</span>
                  <span>✓ Publish Own Posts</span>
                  <span>✓ Save Drafts</span>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Workers cannot manage OpenAI, news sources, advertisements, other workers, or other workers' posts.
                </p>
              </div>

              <button
                type="button"
                onClick={createWorker}
                disabled={working}
                className={`${buttonClass} mt-5`}
              >
                {working
                  ? "Creating Worker..."
                  : "Create Worker Account"}
              </button>

            </div>
          )}

        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl">

          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-bold tracking-widest text-cyan-400">
                STAFF
              </p>

              <h2 className="mt-1 text-xl font-black">
                Worker Accounts
              </h2>
            </div>

            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm font-bold text-cyan-300">
              {workers.length}{" "}
              {workers.length === 1
                ? "Worker"
                : "Workers"}
            </span>

          </div>

          {workers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/50 p-8 text-center">
              <p className="text-lg font-bold text-slate-300">
                No workers yet
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Use Create Worker Account above to create your first staff member.
              </p>
            </div>
          ) : (
            <div className="space-y-3">

              {workers.map((worker) => (
                <div
                  key={worker.user_id}
                  className="rounded-xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-cyan-400/20"
                >

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-white">
                          {worker.display_name}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            worker.active
                              ? "bg-cyan-400/10 text-cyan-300"
                              : "bg-slate-700 text-slate-400"
                          }`}
                        >
                          {worker.active
                            ? "Active"
                            : "Disabled"}
                        </span>

                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">
                          Worker
                        </span>
                      </div>

                      <p className="mt-2 break-all text-sm text-slate-400">
                        {worker.email ||
                          "No email available"}
                      </p>

                      {worker.created_at && (
                        <p className="mt-1 text-xs text-slate-600">
                          Created{" "}
                          {new Date(
                            worker.created_at
                          ).toLocaleDateString()}
                        </p>
                      )}

                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          toggleWorker(worker)
                        }
                        disabled={working}
                        className={secondaryButton}
                      >
                        {worker.active
                          ? "Disable"
                          : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteWorker(worker)
                        }
                        disabled={working}
                        className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:border-cyan-400/30 hover:bg-slate-700 hover:text-cyan-200 disabled:opacity-50"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

        <footer className="border-t border-white/5 pb-10 pt-6 text-center text-xs text-slate-600">
          <span className="text-cyan-500">
            JNMulee
          </span>{" "}
          News Admin • Worker Management
        </footer>

      </div>
    </main>
  );
}