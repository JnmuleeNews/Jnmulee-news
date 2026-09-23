"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const NEWS_CATEGORIES = [
  "Top Stories",
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

type Source = {
  id: string;
  name: string;
  feed_url: string;
  category: string;
  active: boolean;
  created_at?: string;
};

type DirectAd = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  active: boolean;
  created_at?: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [sources, setSources] = useState<Source[]>([]);
  const [ads, setAds] = useState<DirectAd[]>([]);

  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [category, setCategory] = useState("Top Stories");

  const [adTitle, setAdTitle] = useState("");
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adTargetUrl, setAdTargetUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [addingSource, setAddingSource] = useState(false);
  const [addingAd, setAddingAd] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const [sourceResult, adResult] = await Promise.all([
      supabase
        .from("sources")
        .select("id,name,feed_url,category,active,created_at")
        .order("created_at", { ascending: false }),

      supabase
        .from("direct_ads")
        .select("id,title,image_url,target_url,active,created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (sourceResult.error) {
      setError(sourceResult.error.message);
    } else {
      setSources((sourceResult.data || []) as Source[]);
    }

    if (adResult.error) {
      setError(adResult.error.message);
    } else {
      setAds((adResult.data || []) as DirectAd[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addSource(e: React.FormEvent) {
    e.preventDefault();

    setAddingSource(true);
    setMessage("");
    setError("");

    if (!name.trim() || !feedUrl.trim()) {
      setError("Please enter the source name and RSS feed URL.");
      setAddingSource(false);
      return;
    }

    const { error } = await supabase.from("sources").insert({
      name: name.trim(),
      feed_url: feedUrl.trim(),
      category,
      active: true,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("News source added successfully.");
      setName("");
      setFeedUrl("");
      setCategory("Top Stories");
      await loadData();
    }

    setAddingSource(false);
  }

  async function deleteSource(id: string) {
    if (!confirm("Delete this news source?")) {
      return;
    }

    setMessage("");
    setError("");

    const { error } = await supabase
      .from("sources")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
    } else {
      setMessage("News source deleted.");
      await loadData();
    }
  }

  async function toggleSource(source: Source) {
    setMessage("");
    setError("");

    const { error } = await supabase
      .from("sources")
      .update({ active: !source.active })
      .eq("id", source.id);

    if (error) {
      setError(error.message);
    } else {
      await loadData();
    }
  }

  async function addAd(e: React.FormEvent) {
    e.preventDefault();

    setAddingAd(true);
    setMessage("");
    setError("");

    if (!adTitle.trim() || !adImageUrl.trim() || !adTargetUrl.trim()) {
      setError("Please fill in all advertisement fields.");
      setAddingAd(false);
      return;
    }

    const { error } = await supabase.from("direct_ads").insert({
      title: adTitle.trim(),
      image_url: adImageUrl.trim(),
      target_url: adTargetUrl.trim(),
      active: true,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Advertisement added successfully.");
      setAdTitle("");
      setAdImageUrl("");
      setAdTargetUrl("");
      await loadData();
    }

    setAddingAd(false);
  }

  async function deleteAd(id: string) {
    if (!confirm("Delete this advertisement?")) {
      return;
    }

    setMessage("");
    setError("");

    const { error } = await supabase
      .from("direct_ads")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Advertisement deleted.");
      await loadData();
    }
  }

  async function toggleAd(ad: DirectAd) {
    setMessage("");
    setError("");

    const { error } = await supabase
      .from("direct_ads")
      .update({ active: !ad.active })
      .eq("id", ad.id);

    if (error) {
      setError(error.message);
    } else {
      await loadData();
    }
  }

  async function runNewsImport() {
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/fetch-news", {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "News import failed.");
        return;
      }

      setMessage(
        data?.message || "RSS news import completed successfully."
      );
    } catch {
      setError("Unable to start the news import.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <main className="dashboardPage">
      <header className="dashboardHeader">
        <div className="container dashboardHeaderInner">
          <div>
            <Link href="/admin" className="dashboardBrand">
              JNMulee News Admin
            </Link>
            <p className="dashboardSubtitle">
              Manage news sources, RSS feeds and advertisements
            </p>
          </div>

          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="container">
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        <section className="section">
          <div className="sectionHeader">
            <div>
              <h1>News Sources</h1>
              <p>
                Connect RSS feeds and choose the category where imported
                stories should appear.
              </p>
            </div>

            <button type="button" onClick={runNewsImport}>
              Import News Now
            </button>
          </div>

          <form onSubmit={addSource} className="form">
            <label>
              Source Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Example: Crypto News"
              />
            </label>

            <label>
              RSS Feed URL
              <input
                type="url"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://example.com/feed/"
              />
            </label>

            <label>
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {NEWS_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={addingSource}>
              {addingSource ? "Adding..." : "Add News Source"}
            </button>
          </form>
        </section>

        <section className="section">
          <h2>Connected News Sources</h2>

          {loading ? (
            <p>Loading sources...</p>
          ) : sources.length === 0 ? (
            <p>No news sources connected yet.</p>
          ) : (
            <div className="sourceList">
              {sources.map((source) => (
                <div className="sourceItem" key={source.id}>
                  <div>
                    <h3>{source.name}</h3>
                    <p>{source.feed_url}</p>

                    <span className="categoryBadge">
                      {source.category}
                    </span>

                    <span
                      className={
                        source.active
                          ? "statusBadge active"
                          : "statusBadge"
                      }
                    >
                      {source.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="adminActions">
                    <button
                      type="button"
                      onClick={() => toggleSource(source)}
                    >
                      {source.active ? "Disable" : "Enable"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteSource(source.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <div className="sectionHeader">
            <div>
              <h2>News Management</h2>
              <p>Create and manage articles manually.</p>
            </div>

            <Link href="/admin/news" className="adminLink">
              Manage News
            </Link>

            <Link href="/admin/news/new" className="adminLink">
              Create News
            </Link>
          </div>
        </section>

        <section className="section">
          <h2>Direct Advertisements</h2>
          <p>
            Add advertisements that can be displayed on the website.
          </p>

          <form onSubmit={addAd} className="form">
            <label>
              Advertisement Title
              <input
                type="text"
                value={adTitle}
                onChange={(e) => setAdTitle(e.target.value)}
                placeholder="Advertisement title"
              />
            </label>

            <label>
              Advertisement Image URL
              <input
                type="url"
                value={adImageUrl}
                onChange={(e) => setAdImageUrl(e.target.value)}
                placeholder="https://example.com/ad.jpg"
              />
            </label>

            <label>
              Advertisement Target URL
              <input
                type="url"
                value={adTargetUrl}
                onChange={(e) => setAdTargetUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </label>

            <button type="submit" disabled={addingAd}>
              {addingAd ? "Adding..." : "Add Advertisement"}
            </button>
          </form>
        </section>

        <section className="section">
          <h2>Current Advertisements</h2>

          {loading ? (
            <p>Loading advertisements...</p>
          ) : ads.length === 0 ? (
            <p>No advertisements added yet.</p>
          ) : (
            <div className="sourceList">
              {ads.map((ad) => (
                <div className="sourceItem" key={ad.id}>
                  <div>
                    <h3>{ad.title}</h3>
                    <p>{ad.target_url}</p>

                    <span
                      className={
                        ad.active
                          ? "statusBadge active"
                          : "statusBadge"
                      }
                    >
                      {ad.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="adminActions">
                    <button
                      type="button"
                      onClick={() => toggleAd(ad)}
                    >
                      {ad.active ? "Disable" : "Enable"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteAd(ad.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}