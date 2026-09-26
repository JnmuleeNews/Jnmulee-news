"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CommentRow = {
  id: string;
  news_id: string;
  name: string;
  comment: string;
  approved: boolean;
  created_at: string;
};

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadComments() {
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    if (user.app_metadata?.role !== "admin") {
      setError("You do not have administrator access.");
      setLoading(false);
      return;
    }

    const { data, error: commentsError } = await supabase
      .from("comments")
      .select(
        "id,news_id,name,comment,approved,created_at"
      )
      .order("created_at", { ascending: false });

    if (commentsError) {
      setError(commentsError.message);
    } else {
      setComments((data || []) as CommentRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadComments();
  }, []);

  async function setApproved(
    comment: CommentRow,
    approved: boolean
  ) {
    setMessage("");
    setError("");

    const { error: updateError } = await supabase
      .from("comments")
      .update({ approved })
      .eq("id", comment.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(
      approved
        ? "Comment approved."
        : "Comment moved back to moderation."
    );

    await loadComments();
  }

  async function deleteComment(comment: CommentRow) {
    const confirmed = window.confirm(
      `Delete this comment from ${comment.name}?`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", comment.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Comment deleted.");

    await loadComments();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
            <p className="text-slate-400">
              Loading comments...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-white"
          >
            JNMulee{" "}
            <span className="text-cyan-400">
              News
            </span>
          </Link>

          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/admin"
              className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-cyan-400"
            >
              Dashboard
            </Link>

            <Link
              href="/admin/news"
              className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-cyan-400"
            >
              News
            </Link>

            <Link
              href="/admin/news/new"
              className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-cyan-400"
            >
              Add News
            </Link>

            <Link
              href="/admin/comments"
              className="rounded-lg bg-cyan-400 px-3 py-2 font-bold text-slate-950"
            >
              Comments
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="mb-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-cyan-400">
            JNMulee News Admin
          </p>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Comment Moderation
          </h1>

          <p className="mt-2 max-w-2xl text-slate-400">
            Review, approve, unapprove, or delete
            comments submitted by visitors.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-cyan-300">
            {error}
          </div>
        )}

        <section className="space-y-4">
          {comments.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/10 text-2xl text-cyan-400">
                💬
              </div>

              <h2 className="text-xl font-bold">
                No comments yet
              </h2>

              <p className="mt-2 text-slate-400">
                Visitor comments will appear here.
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <article
                key={comment.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10 transition hover:border-cyan-400/30"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-bold text-white">
                      {comment.name}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(
                        comment.created_at
                      ).toLocaleString()}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${
                      comment.approved
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                        : "border-slate-700 bg-slate-800 text-slate-300"
                    }`}
                  >
                    {comment.approved
                      ? "Approved"
                      : "Pending"}
                  </span>
                </div>

                <div className="my-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="whitespace-pre-wrap leading-7 text-slate-200">
                    {comment.comment}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setApproved(
                        comment,
                        !comment.approved
                      )
                    }
                    className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {comment.approved
                      ? "Unapprove"
                      : "Approve"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteComment(comment)
                    }
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-700"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}