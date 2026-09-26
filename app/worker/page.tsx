"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  image_url: string | null;
  Published: boolean;
  created_at: string;
};

const categories = [
  "Top Stories",
  "News",
  "Nigeria",
  "World",
  "Business",
  "Technology",
  "Sports",
  "Gossip",
  "Entertainment",
  "Politics",
  "Crypto",
];

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function WorkerDashboard() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Top Stories");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(true);

  useEffect(() => {
    loadWorker();
  }, []);

  async function loadWorker() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/worker/login");
        return;
      }

      const role = user.app_metadata?.role;

      if (role === "admin") {
        router.replace("/admin");
        return;
      }

      if (role !== "worker") {
        await supabase.auth.signOut();
        router.replace("/worker/login");
        return;
      }

      if (
        user.banned_until &&
        new Date(user.banned_until).getTime() > Date.now()
      ) {
        await supabase.auth.signOut();
        router.replace("/worker/login");
        return;
      }

      setUserId(user.id);

      setWorkerName(
        user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          "Worker"
      );

      setWorkerEmail(user.email || "");

      await loadPosts(user.id);
    } catch (err) {
      console.error(err);
      setError("Unable to load your worker account.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPosts(currentUserId?: string) {
    const id = currentUserId || userId;

    if (!id) return;

    const { data, error: postsError } = await supabase
      .from("news")
      .select(
        "id,title,slug,content,category,image_url,Published,created_at"
      )
      .eq("author_id", id)
      .order("created_at", {
        ascending: false,
      });

    if (postsError) {
      console.error(postsError);
      setError(postsError.message);
      return;
    }

    setPosts((data || []) as Post[]);
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setSlug("");
    setContent("");
    setCategory("Top Stories");
    setImageUrl("");
    setPublished(true);
  }

  function startEdit(post: Post) {
    setEditingId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setContent(post.content);
    setCategory(post.category || "Top Stories");
    setImageUrl(post.image_url || "");
    setPublished(post.Published === true);

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function savePost(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/worker/login");
        return;
      }

      if (user.app_metadata?.role !== "worker") {
        await supabase.auth.signOut();
        router.replace("/worker/login");
        return;
      }

      const cleanTitle = title.trim();
      const cleanContent = content.trim();
      const cleanImageUrl = imageUrl.trim();
      const finalSlug =
        slug.trim() || makeSlug(cleanTitle);

      if (!cleanTitle) {
        setError("Enter a headline.");
        return;
      }

      if (!cleanContent) {
        setError("Enter the article content.");
        return;
      }

      if (!finalSlug) {
        setError("Enter a valid headline.");
        return;
      }

      if (published && !cleanImageUrl) {
        setError(
          "A published article must have an image. Add an image URL or save it as a draft."
        );
        return;
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from("news")
          .update({
            title: cleanTitle,
            slug: finalSlug,
            content: cleanContent,
            category,
            image_url: cleanImageUrl || null,
            Published: published,
          })
          .eq("id", editingId)
          .eq("author_id", user.id);

        if (updateError) {
          setError(updateError.message);
          return;
        }

        setSuccess("Your post has been updated.");
      } else {
        const { error: insertError } = await supabase
          .from("news")
          .insert({
            title: cleanTitle,
            slug: finalSlug,
            content: cleanContent,
            category,
            image_url: cleanImageUrl || null,
            Published: published,
            author_id: user.id,
          });

        if (insertError) {
          setError(insertError.message);
          return;
        }

        setSuccess(
          published
            ? "Your post has been published."
            : "Your post has been saved as a draft."
        );
      }

      await loadPosts(user.id);

      resetForm();
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving the post.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);

    await supabase.auth.signOut();

    window.location.replace("/worker/login");
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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-black">
              <span className="text-white">JNMulee</span>{" "}
              <span className="text-cyan-400">News</span>
            </h1>
            <p className="text-xs text-slate-500">
              Worker Dashboard
            </p>
          </div>

          <button
            onClick={logout}
            disabled={loggingOut}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-50"
          >
            {loggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
            Worker Account
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Welcome, {workerName}
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {workerEmail}
          </p>

          <div className="mt-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300">
            Worker Access
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
                {editingId ? "Edit Post" : "Create Post"}
              </p>

              <h3 className="mt-1 text-2xl font-black">
                {editingId
                  ? "Edit your article"
                  : "Write a new article"}
              </h3>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
              >
                Cancel
              </button>
            )}
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-300">
              {success}
            </div>
          )}

          <form
            onSubmit={savePost}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-bold">
                Headline
              </label>

              <input
                value={title}
                onChange={(event) => {
                  const value = event.target.value;
                  setTitle(value);

                  if (!editingId && !slug) {
                    setSlug(makeSlug(value));
                  }
                }}
                required
                placeholder="Enter article headline"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Slug
              </label>

              <input
                value={slug}
                onChange={(event) =>
                  setSlug(makeSlug(event.target.value))
                }
                placeholder="article-url-slug"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Category
              </label>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Image URL
              </label>

              <input
                type="url"
                value={imageUrl}
                onChange={(event) =>
                  setImageUrl(event.target.value)
                }
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />

              <p className="mt-2 text-xs text-slate-500">
                A published article must have an image.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Article Content
              </label>

              <textarea
                value={content}
                onChange={(event) =>
                  setContent(event.target.value)
                }
                required
                rows={16}
                placeholder="Write the complete article here..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
              <input
                type="checkbox"
                checked={published}
                onChange={(event) =>
                  setPublished(event.target.checked)
                }
                className="h-5 w-5 accent-cyan-400"
              />

              <span>
                <span className="block font-bold">
                  Publish immediately
                </span>

                <span className="text-xs text-slate-500">
                  Turn this off to save a draft.
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-cyan-400 px-5 py-3.5 font-black text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update My Post"
                : published
                ? "Publish Post"
                : "Save Draft"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
              My Posts
            </p>

            <h3 className="mt-1 text-2xl font-black">
              Your Articles
            </h3>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
              You have not created any posts yet.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-lg font-black">
                        {post.title}
                      </h4>

                      <p className="mt-2 text-xs text-slate-500">
                        {formatDate(post.created_at)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                          {post.category || "News"}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            post.Published
                              ? "bg-cyan-400/10 text-cyan-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {post.Published
                            ? "Published"
                            : "Draft"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => startEdit(post)}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
                    >
                      Edit My Post
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}