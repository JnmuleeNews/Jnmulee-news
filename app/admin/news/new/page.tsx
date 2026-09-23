
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [published, setPublished] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveNews(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    let imageUrl = "";

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop() || "jpg";

      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("news-images")
        .upload(fileName, imageFile);

      if (uploadError) {
        setSaving(false);
        setError(uploadError.message);
        return;
      }

      const { data } = supabase.storage
        .from("news-images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    const finalSlug = slug.trim() || makeSlug(title);

    const { error: insertError } = await supabase
      .from("news")
      .insert({
        title: title.trim(),
        slug: finalSlug,
        content: content.trim(),
        category,
        image_url: imageUrl || null,
        Published: published,
      });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
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
            <option>Gossip</option>
            <option>Entertainment</option>
            <option>Politics</option>
          </select>

          <label>News Image</label>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setImageFile(e.target.files?.[0] || null);
            }}
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
              style={{
                width: "auto",
                marginRight: 8,
              }}
            />

            Publish immediately
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={saving}>
            {saving ? "Uploading & Saving..." : "Save News"}
          </button>

          <a href="/admin">Cancel</a>
        </form>
      </section>
    </main>
  );
}