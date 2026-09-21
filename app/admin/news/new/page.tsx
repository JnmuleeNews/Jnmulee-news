"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewNewsPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Top Stories");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveNews(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const finalSlug = slug.trim() || makeSlug(title);

    const { error } = await supabase.from("news").insert({
      title: title.trim(),
      slug: finalSlug,
      content: content.trim(),
      category,
      image_url: imageUrl.trim() || null,
      Published: published
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/admin");
  }

  return (
    <main className="dashboardPage">
      <header className="dashboardHeader">
        <div className="container">
          <a className="brand" href="/">
            JNMulee <span>News</span>
          </a>
        </div>
      </header>

      <section className="container section">
        <h1>Create News</h1>

        <form className="form" onSubmit={saveNews}>
          <label>Headline</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <label>Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Leave empty to generate automatically"
          />

          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Top Stories</option>
            <option>World</option>
            <option>Business</option>
            <option>Technology</option>
            <option>Sports</option>
            <option>Entertainment</option>
            <option>Politics</option>
          </select>

          <label>Image URL (optional)</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />

          <label>Article content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />

          <label>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              style={{ width: "auto", marginRight: 8 }}
            />
            Publish immediately
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save News"}
          </button>

          <a href="/admin">Cancel</a>
        </form>
      </section>
    </main>
  );
}