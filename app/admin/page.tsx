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

const AD_PLACEMENTS = [
  { value: "homepage", label: "Homepage" },
  { value: "ads_page", label: "Ads Page" },
  { value: "homepage_ads", label: "Homepage + Ads Page" },
];

type Source = {
  id: string;
  name: string;
  feed_url: string;
  category: string;
  active: boolean;
  created_at?: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [sources, setSources] = useState<Source[]>([]);

  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [category, setCategory] = useState("Top Stories");

  const [adTitle, setAdTitle] = useState("");
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adLinkUrl, setAdLinkUrl] = useState("");
  const [adPlacement, setAdPlacement] = useState("homepage");

  const [loading, setLoading] = useState(true);
  const [addingSource, setAddingSource] = useState(false);
  const [addingAd, setAddingAd] = useState(false);
  const [importing, setImporting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("sources")
      .select("id,name,feed_url,category,active,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setSources((data || []) as Source[]);
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
      .update({
        active: !source.active,
      })
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

    if (
      !adTitle.trim() ||
      !adImageUrl.trim() ||
      !adLinkUrl.trim()
    ) {
      setError(
        "Please fill in the advertisement title, image URL and link."
      );

      setAddingAd(false);
      return;
    }

    const { error } = await supabase.from("direct_ads").insert({
      title: adTitle.trim(),
      image_url: adImageUrl.trim(),
      link_url: adLinkUrl.trim(),
      placement: adPlacement,
      active: true,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage(
        "Personal advertisement added successfully."
      );

      setAdTitle("");
      setAdImageUrl("");
      setAdLinkUrl("");
      setAdPlacement("homepage");
    }

    setAddingAd(false);
  }

  async function runNewsImport() {
    setMessage("");
    setError("");
    setImporting(true);

    try {
      const response = await fetch("/api/fetch-news", {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.error || "News import failed."
        );
        return;
      }

      setMessage(
        data?.message ||
          "RSS news import completed successfully."
      );

      await loadData();
    } catch {
      setError("Unable to start the news import.");
    } finally {
      setImporting(false);
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
            <Link
              href="/admin"
              className="dashboardBrand"
            >
              JNMulee News Admin
            </Link>

            <p className="dashboardSubtitle">
              Manage news, RSS feeds and personal
              advertisements
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="container">
        {message && (
          <div className="success">
            {message}
          </div>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* POST NEWS */}
        <section className="section">
          <div className="sectionHeader">
            <div>
              <h1>Post News</h1>

              <p>
                Create your own news article, add an
                image and publish it directly to
                JNMulee News.
              </p>
            </div>

            <Link
              href="/admin/news/new"
              className="adminLink"
            >
              + Post News
            </Link>
          </div>
        </section>

        {/* COMMENT MANAGEMENT */}
        <section className="section">
          <div className="sectionHeader">
            <div>
              <h2>Comments</h2>

              <p>
                Review, approve or delete comments
                submitted by visitors.
              </p>
            </div>

            <Link
              href="/admin/comments"
              className="adminLink"
            >
              Manage Comments
            </Link>
          </div>
        </section>

        {/* NEWS SOURCES */}
        <section className="section">
          <div className="sectionHeader">
            <div>
              <h2>News Sources / RSS Feeds</h2>

              <p>
                Connect RSS feeds and choose the
                category where imported stories
                should appear.
              </p>
            </div>

            <button
              type="button"
              onClick={runNewsImport}
              disabled={importing}
            >
              {importing
                ? "Importing..."
                : "Import News Now"}
            </button>
          </div>

          <form
            onSubmit={addSource}
            className="form"
          >
            <label>
              Source Name

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Example: Crypto News"
              />
            </label>

            <label>
              RSS Feed URL

              <input
                type="url"
                value={feedUrl}
                onChange={(e) =>
                  setFeedUrl(e.target.value)
                }
                placeholder="https://example.com/feed/"
              />
            </label>

            <label>
              Feed Category

              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
              >
                {NEWS_CATEGORIES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </label>

            <button
              type="submit"
              disabled={addingSource}
            >
              {addingSource
                ? "Adding..."
                : "Add RSS Source"}
            </button>
          </form>

          <div className="adminList">
            <h3>Connected Sources</h3>

            {loading ? (
              <p>Loading sources...</p>
            ) : sources.length === 0 ? (
              <p>
                No RSS sources added yet.
              </p>
            ) : (
              sources.map((source) => (
                <div
                  className="adminListItem"
                  key={source.id}
                >
                  <div>
                    <strong>
                      {source.name}
                    </strong>

                    <p>
                      {source.feed_url}
                    </p>

                    <small>
                      {source.category} ·{" "}
                      {source.active
                        ? "Active"
                        : "Disabled"}
                    </small>
                  </div>

                  <div className="adminActions">
                    <button
                      type="button"
                      onClick={() =>
                        toggleSource(
                          source
                        )
                      }
                    >
                      {source.active
                        ? "Disable"
                        : "Enable"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteSource(
                          source.id
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* PERSONAL ADVERTISEMENTS */}
        <section className="section">
          <div className="sectionHeader">
            <div>
              <h2>
                Personal Advertisements
              </h2>

              <p>
                Add an image advertisement
                that can appear on the
                selected placement.
              </p>
            </div>

            <Link
              href="/ads"
              className="adminLink"
            >
              View Ads Page
            </Link>
          </div>

          <form
            onSubmit={addAd}
            className="form"
          >
            <label>
              Advertisement Title

              <input
                type="text"
                value={adTitle}
                onChange={(e) =>
                  setAdTitle(e.target.value)
                }
                placeholder="Example: JNMulee Business"
              />
            </label>

            <label>
              Advertisement Image URL

              <input
                type="url"
                value={adImageUrl}
                onChange={(e) =>
                  setAdImageUrl(
                    e.target.value
                  )
                }
                placeholder="https://example.com/ad-image.jpg"
              />
            </label>

            <label>
              Advertisement Link

              <input
                type="url"
                value={adLinkUrl}
                onChange={(e) =>
                  setAdLinkUrl(
                    e.target.value
                  )
                }
                placeholder="https://example.com"
              />
            </label>

            <label>
              Placement

              <select
                value={adPlacement}
                onChange={(e) =>
                  setAdPlacement(
                    e.target.value
                  )
                }
              >
                {AD_PLACEMENTS.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  )
                )}
              </select>
            </label>

            <button
              type="submit"
              disabled={addingAd}
            >
              {addingAd
                ? "Adding..."
                : "Add Advertisement"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}