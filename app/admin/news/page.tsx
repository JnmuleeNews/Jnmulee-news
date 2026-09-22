"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type News = {
  id: number;
  title: string;
  content: string;
  category: string;
  image_url: string | null;
  Published: boolean;
  created_at: string;
};

export default function NewsManagementPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNews() {
    const { data, error } = await supabase
      .from("news")
      .select(
        "id,title,content,category,image_url,Published,created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setNews(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadNews();
  }, []);

  async function publishNews(id: number) {
    const { error } = await supabase
      .from("news")
      .update({ Published: true })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadNews();
  }

  async function unpublishNews(id: number) {
    const { error } = await supabase
      .from("news")
      .update({ Published: false })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadNews();
  }

  return (
    <main className="dashboardPage">
      <header className="dashboardHeader">
        <div className="container">
          <a className="brand" href="/admin">
            JNMulee <span>News</span>
          </a>

          <a href="/admin">Back to Dashboard</a>
        </div>
      </header>

      <section className="container section">
        <h1>News Management</h1>

        <a href="/admin/news/new">
          <button type="button">+ Create News</button>
        </a>

        {loading ? (
          <p>Loading news...</p>
        ) : news.length === 0 ? (
          <p>No news found.</p>
        ) : (
          <div className="form">
            {news.map((article) => (
              <div key={article.id}>
                <h2>{article.title}</h2>

                <p>
                  <strong>Category:</strong> {article.category}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {article.Published ? "Published" : "Draft"}
                </p>

                <p>
                  {article.content.slice(0, 300)}
                  {article.content.length > 300 ? "..." : ""}
                </p>

                {article.Published ? (
                  <button
                    type="button"
                    onClick={() => unpublishNews(article.id)}
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => publishNews(article.id)}
                  >
                    Publish
                  </button>
                )}

                <hr />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}