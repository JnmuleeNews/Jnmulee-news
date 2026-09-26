"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Permissions = {
  can_import: boolean;
  can_write: boolean;
  can_publish: boolean;
  can_manage_comments: boolean;
};

type Worker = {
  id: string;
  email: string;
  display_name: string;
  permissions: Permissions;
  active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const emptyPermissions: Permissions = {
  can_import: false,
  can_write: true,
  can_publish: false,
  can_manage_comments: false,
};

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [permissions, setPermissions] =
    useState<Permissions>({
      ...emptyPermissions,
    });

  async function getAccessToken() {
    const {
      data,
      error,
    } = await supabase.auth.getSession();

    if (error || !data.session) {
      throw new Error(
        "Your admin session has expired. Please sign in again."
      );
    }

    return data.session.access_token;
  }

  async function loadWorkers() {
    setLoading(true);
    setError("");

    try {
      const token =
        await getAccessToken();

      const response =
        await fetch(
          "/api/admin/workers",
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load workers."
        );
      }

      setWorkers(
        Array.isArray(
          result.workers
        )
          ? result.workers
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
  }

  useEffect(() => {
    loadWorkers();
  }, []);

  function updatePermission(
    key: keyof Permissions
  ) {
    setPermissions(
      (current) => ({
        ...current,
        [key]:
          !current[key],
      })
    );
  }

  async function createWorker(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError(
        "Enter the worker's name."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Enter the worker's email."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Worker password must be at least 8 characters."
      );
      return;
    }

    setSaving(true);

    try {
      const token =
        await getAccessToken();

      const response =
        await fetch(
          "/api/admin/workers",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              display_name:
                name.trim(),
              email:
                email.trim(),
              password,
              permissions,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to create worker."
        );
      }

      setName("");
      setEmail("");
      setPassword("");

      setPermissions({
        ...emptyPermissions,
      });

      setSuccess(
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
      setSaving(false);
    }
  }

  async function toggleWorker(
    worker: Worker
  ) {
    setError("");
    setSuccess("");

    try {
      const token =
        await getAccessToken();

      const response =
        await fetch(
          "/api/admin/workers",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              id: worker.id,
              display_name:
                worker.display_name,
              permissions:
                worker.permissions,
              active:
                !worker.active,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update worker."
        );
      }

      setSuccess(
        worker.active
          ? `${worker.display_name} has been disabled.`
          : `${worker.display_name} has been enabled.`
      );

      await loadWorkers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update worker."
      );
    }
  }

  async function deleteWorker(
    worker: Worker
  ) {
    const confirmed =
      window.confirm(
        `Delete the worker account "${worker.display_name}"? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const token =
        await getAccessToken();

      const response =
        await fetch(
          "/api/admin/workers",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              id: worker.id,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to delete worker."
        );
      }

      setSuccess(
        `${worker.display_name} was deleted.`
      );

      await loadWorkers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete worker."
      );
    }
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "Never";
    }

    try {
      return new Date(
        value
      ).toLocaleString();
    } catch {
      return "Unknown";
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-3 inline-block text-sm font-semibold text-cyan-400 hover:text-cyan-300"
            >
              ← Back to Admin
            </Link>

            <h1 className="text-3xl font-black tracking-tight">
              Worker Management
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Create staff accounts and control what each worker can do.
            </p>
          </div>

          <button
            type="button"
            onClick={loadWorkers}
            disabled={loading}
            className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-50"
          >
            {loading
              ? "Refreshing..."
              : "Refresh Workers"}
          </button>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
            {success}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">

          {/* CREATE WORKER */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-black">
                Create Worker
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Give a trusted staff member their own login.
              </p>
            </div>

            <form
              onSubmit={createWorker}
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-200">
                  Worker name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Example: John"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-200">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="worker@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-200">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-black text-white">
                  Permissions
                </h3>

                <div className="space-y-3">
                  <PermissionBox
                    label="Import news"
                    description="Allow this worker to run news/feed imports."
                    checked={
                      permissions.can_import
                    }
                    onChange={() =>
                      updatePermission(
                        "can_import"
                      )
                    }
                  />

                  <PermissionBox
                    label="Write articles"
                    description="Allow this worker to create and edit articles."
                    checked={
                      permissions.can_write
                    }
                    onChange={() =>
                      updatePermission(
                        "can_write"
                      )
                    }
                  />

                  <PermissionBox
                    label="Publish articles"
                    description="Allow this worker to publish articles."
                    checked={
                      permissions.can_publish
                    }
                    onChange={() =>
                      updatePermission(
                        "can_publish"
                      )
                    }
                  />

                  <PermissionBox
                    label="Manage comments"
                    description="Allow this worker to moderate comments."
                    checked={
                      permissions.can_manage_comments
                    }
                    onChange={() =>
                      updatePermission(
                        "can_manage_comments"
                      )
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Creating Worker..."
                  : "Create Worker"}
              </button>
            </form>
          </section>

          {/* WORKER LIST */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">
                  Your Workers
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {workers.length} worker
                  {workers.length === 1
                    ? ""
                    : "s"} registered
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">
                Loading workers...
              </div>
            ) : workers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-10 text-center">
                <div className="mb-3 text-4xl">
                  👤
                </div>

                <h3 className="font-bold text-white">
                  No workers yet
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Create your first worker using the form.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {workers.map(
                  (worker) => (
                    <div
                      key={worker.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-black">
                              {
                                worker.display_name
                              }
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                worker.active
                                  ? "bg-cyan-400/10 text-cyan-300"
                                  : "bg-slate-800 text-slate-500"
                              }`}
                            >
                              {worker.active
                                ? "ACTIVE"
                                : "DISABLED"}
                            </span>
                          </div>

                          <p className="mt-1 break-all text-sm text-slate-400">
                            {worker.email}
                          </p>

                          <p className="mt-2 text-xs text-slate-600">
                            Last login:{" "}
                            {formatDate(
                              worker.last_sign_in_at
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              toggleWorker(
                                worker
                              )
                            }
                            className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-400/20"
                          >
                            {worker.active
                              ? "Disable"
                              : "Enable"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteWorker(
                                worker
                              )
                            }
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-800 pt-4">
                        <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">
                          Permissions
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <PermissionBadge
                            enabled={
                              worker.permissions
                                .can_import
                            }
                            label="Import"
                          />

                          <PermissionBadge
                            enabled={
                              worker.permissions
                                .can_write
                            }
                            label="Write"
                          />

                          <PermissionBadge
                            enabled={
                              worker.permissions
                                .can_publish
                            }
                            label="Publish"
                          />

                          <PermissionBadge
                            enabled={
                              worker.permissions
                                .can_manage_comments
                            }
                            label="Comments"
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function PermissionBox({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 transition hover:border-cyan-400/30">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-cyan-400"
      />

      <span>
        <span className="block text-sm font-bold text-white">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function PermissionBadge({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        enabled
          ? "bg-cyan-400/10 text-cyan-300"
          : "bg-slate-900 text-slate-600"
      }`}
    >
      {enabled
        ? `✓ ${label}`
        : `— ${label}`}
    </span>
  );
}