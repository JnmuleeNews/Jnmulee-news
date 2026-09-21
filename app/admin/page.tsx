"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Source = {
  id: number;
  name: string;
  url: string;
  category: string;
  active: boolean;
};

export default function AdminPage() {
  const router = useRouter();

  const [sources, setSources] = useState<Source[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Top Stories");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSources() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const { data } = await supabase
      .from("sources")
      .select("id,name,url,category,active")
      .order("id", { ascending: false });

    setSources(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSources();
  }, []);

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("sources").insert({
      name: name.trim(),
      url: url.trim(),
      category,
      active: true
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setUrl("");
    await loadSources();
  }

  async function deleteSource(id: number) {
    await supabase.from("sources").delete().eq("id", id);
    await loadSources();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <main className="dashboardPage">
      <header className="dashboardHeader">
        <div className="container">
          <Link className="brand" href="/">
            JNMulee <span>News</span>
          </Link>

          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="container section">
        <h1>News Dashboard</h1>

        <div className="adminActions">
          <Link href="/admin/news/new">
            <button type="button">+ Create News</button>
          </Link>

          <Link href="/">
            <button type="button">View Website</button>
          </Link>
        </div>

        <h2>News Sources</h2>

        <form className="form" onSubmit={addSource}>
          <label>Source name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example News"
            required
          />

          <label>RSS / Feed URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/feed"
            required
          />

          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Top Stories</option>
            <option>Nigeria</option>
            <option>World</option>
            <option>Business</option>
            <option>Technology</option>
            <option>Sports</option>
            <option>Entertainment</option>
          </select>

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Add Source"}
          </button>
        </form>

        <h2>Connected Sources</h2>

        {loading ? (
          <p>Loading sources...</p>
        ) : sources.length === 0 ? (
          <p>No sources connected yet.</p>
        ) : (
          <div className="form">
            {sources.map((source) => (
              <div key={source.id}>
                <strong>{source.name}</strong>
                <p>{source.url}</p>
                <p>{source.category}</p>
                <button onClick={() => deleteSource(source.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}