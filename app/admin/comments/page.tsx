"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Comment = {
  id: string;
  news_id: string;
  name: string;
  comment: string;
  approved: boolean;
  created_at: string;
};

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadComments() {
    setLoading(true);

    const { data, error } = await supabase
      .from("comments")
      .select(
        "id,news_id,name,comment,approved,created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setComments(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadComments();
  }, []);

  async function updateApproval(
    id: string,
    approved: boolean
  ) {
    setMessage("");

    const { error } = await supabase
      .from("comments")
      .update({ approved })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setComments((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, approved }
          : item
      )
    );
  }

  async function deleteComment(id: string) {
    const confirmed = window.confirm(
      "Delete this comment permanently?"
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setComments((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  return (
    <main>
      <header className="siteHeader">
        <div className="container headerInner">
          <Link href="/" className="logo">
            JNMulee News
          </Link>

          <nav>
            <Link href="/admin">Admin</Link>
            <Link href="/admin/news">News</Link>
            <Link href="/admin/news/new">
              Add News
            </Link>
            <Link href="/admin/comments">
              Comments
            </Link>
          </nav>
        </div>
      </header>

      <div className="container pageContainer">
        <h1>Comment Moderation</h1>

        <p>
          Review comments before they appear publicly on
          JNMulee News.
        </p>

        {message && (
          <div className="emptyState">
            <p>{message}</p>
          </div>
        )}

        {loading ? (
          <div className="emptyState">
            <p>Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="emptyState">
            <h2>No comments</h2>
            <p>
              There are currently no comments to moderate.
            </p>
          </div>
        ) : (
          <div className="adminComments">
            {comments.map((item) => (
              <article
                key={item.id}
                className="adminComment"
              >
                <div className="adminCommentHeader">
                  <strong>{item.name}</strong>

                  <span>
                    {new Date(
                      item.created_at
                    ).toLocaleString()}
                  </span>
                </div>

                <p>{item.comment}</p>

                <div className="adminCommentActions">
                  {item.approved ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateApproval(item.id, false)
                      }
                    >
                      Unapprove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        updateApproval(item.id, true)
                      }
                    >
                      Approve
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      deleteComment(item.id)
                    }
                  >
                    Delete
                  </button>
                </div>

                <div className="adminCommentStatus">
                  Status:{" "}
                  <strong>
                    {item.approved
                      ? "Approved"
                      : "Pending"}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}