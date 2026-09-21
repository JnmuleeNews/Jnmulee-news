"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type NewsRow = {
  id: string;
  title: string;
  category: string;
  Published: boolean;
  created_at: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [stories, setStories] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadStories() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const { data, error } = await supabase
      .from("news")
      .select("id,title,category,Published,created_at")
      .order("created_at", { ascending: false });

    if (!error) {
      setStories(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStories();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  const publishedCount = stories.filter(
    (story) => story.Published
  ).length;

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

        <div className="dashboard">
          <div>
            <strong>{publishedCount}</strong>
            <span>Published stories</span>
          </div>

          <div>
            <strong>{stories.length}</strong>
            <span>Total stories</span>
          </div>

          <div>
            <strong>Ready</strong>
            <span>Platform status</span>
          </div>
        </div>

        <div className="adminActions">
          <Link href="/admin/news/new">
            <button type="button">+ Create News</button>
          </Link>

          <Link href="/">
            <button type="button">View Website</button>
          </Link>
        </div>

        {loading ? (
          <p>Loading stories...</p>
        ) : stories.length === 0 ? (
          <p>No stories yet. Create your first news article.</p>
        ) : (
          <div className="form">
            {stories.map((story) => (
              <div key={story.id}>
                <strong>{story.title}</strong>
                <p>
                  {story.category} ·{" "}
                  {story.Published ? "Published" : "Draft"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}