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
  {
    value: "homepage_ads",
    label: "Homepage + Ads Page",
  },
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
  const [loggingOut, setLoggingOut] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function checkAuthentication() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return false;
    }

    if (user.app_metadata?.role !== "admin") {
      await supabase.auth.signOut();
      router.replace("/");
      return false;
    }

    return true;
  }

  async function loadData() {
    setLoading(true);
    setError("");

    const authenticated = await checkAuthentication();

    if (!authenticated) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("sources")
      .select(
        "id,name,feed_url,category,active,created_at"
      )
      .order("created_at", {
        ascending: false,
      });

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

  async function addSource(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setAddingSource(true);
    setMessage("");
    setError("");

    const authenticated = await checkAuthentication();

    if (!authenticated) {
      setAddingSource(false);
      return;
    }

    const cleanName = name.trim();
    const cleanFeedUrl = feedUrl.trim();

    if (!cleanName || !cleanFeedUrl) {
      setError(
        "Please enter the source name and RSS feed URL."
      );
      setAddingSource(false);
      return;
    }

    try {
      const parsedUrl = new URL(cleanFeedUrl);

      if (
        parsedUrl.protocol !== "http:" &&
        parsedUrl.protocol !== "https:"
      ) {
        throw new Error("Invalid protocol");
      }
    } catch {
      setError(
        "Please enter a valid RSS feed URL."
      );
      setAddingSource(false);
      return;
    }

    const { error } = await supabase
      .from("sources")
      .insert({
        name: cleanName,
        feed_url: cleanFeedUrl,
        category,
        active: true,
      });

    if (error) {
      setError(error.message);
    } else {
      setMessage(
        "News source added successfully."
      );

      setName("");
      setFeedUrl("");
      setCategory("Top Stories");

      await loadData();
    }

    setAddingSource(false);
  }

  async function deleteSource(id: string) {
    if (
      !window.confirm(
        "Delete this news source? This action cannot be undone."
      )
    ) {
      return;
    }

    setMessage("");
    setError("");

    const authenticated = await checkAuthentication();

    if (!authenticated) return;

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

    const authenticated = await checkAuthentication();

    if (!authenticated) return;

    const { error } = await supabase
      .from("sources")
      .update({
        active: !source.active,
      })
      .eq("id", source.id);

    if (error) {
      setError(error.message);
    } else {
      setMessage(
        source.active
          ? `${source.name} has been disabled.`
          : `${source.name} has been enabled.`
      );

      await loadData();
    }
  }

  async function addAd(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setAddingAd(true);
    setMessage("");
    setError("");

    const authenticated = await checkAuthentication();

    if (!authenticated) {
      setAddingAd(false);
      return;
    }

    const cleanTitle = adTitle.trim();
    const cleanImageUrl = adImageUrl.trim();
    const cleanLinkUrl = adLinkUrl.trim();

    if (
      !cleanTitle ||
      !cleanImageUrl ||
      !cleanLinkUrl
    ) {
      setError(
        "Please fill in the advertisement title, image URL and link."
      );

      setAddingAd(false);
      return;
    }

    try {
      const imageUrl = new URL(cleanImageUrl);
      const linkUrl = new URL(cleanLinkUrl);

      if (
        !["http:", "https:"].includes(
          imageUrl.protocol
        ) ||
        !["http:", "https:"].includes(
          linkUrl.protocol
        )
      ) {
        throw new Error("Invalid protocol");
      }
    } catch {
      setError(
        "Please enter valid advertisement image and link URLs."
      );
      setAddingAd(false);
      return;
    }

    const { error } = await supabase
      .from("direct_ads")
      .insert({
        title: cleanTitle,
        image_url: cleanImageUrl,
        link_url: cleanLinkUrl,
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
    if (importing) return;

    setMessage("");
    setError("");
    setImporting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/admin/login");
        return;
      }

      if (user.app_metadata?.role !== "admin") {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setError(
          "Your admin session has expired. Please sign in again."
        );
        router.replace("/admin/login");
        return;
      }

      /*
       * IMPORTANT:
       *
       * manual=true tells the API route that
       * this import was explicitly started by
       * the administrator.
       *
       * Automatic/scheduled imports do not send
       * this parameter and continue using the
       * normal OpenAI and quality rules.
       */
      const response = await fetch(
        "/api/fetch-news?manual=true",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      let data: {
        message?: string;
        error?: string;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401) {
        setError(
          "Your admin session is no longer authorized. Please sign in again."
        );

        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        setError(
          data?.error ||
            "News import failed."
        );
        return;
      }

      setMessage(
        data?.message ||
          "RSS news import completed successfully."
      );

      await loadData();
    } catch {
      setError(
        "Unable to start the news import."
      );
    } finally {
      setImporting(false);
    }
  }

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setMessage("");
    setError("");

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      setLoggingOut(false);
      return;
    }

    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="adminPage">
      <style>{`
        .adminPage {
          min-height: 100vh;
          background: #f7f9fc;
          color: #172033;
          padding-bottom: 70px;
        }

        .adminContainer {
          width: min(1200px, calc(100% - 32px));
          margin: 0 auto;
        }

        .adminHeader {
          background:
            linear-gradient(
              135deg,
              #0b1220 0%,
              #111c31 60%,
              #17284a 100%
            );
          color: #ffffff;
          border-bottom: 1px solid rgba(255,255,255,.08);
          box-shadow: 0 10px 30px rgba(11,18,32,.13);
        }

        .adminHeaderInner {
          min-height: 86px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .adminBrand {
          color: #ffffff;
          text-decoration: none;
          font-size: 24px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -.7px;
        }

        .adminBrand:hover {
          color: #dbeafe;
        }

        .adminSubtitle {
          margin: 7px 0 0;
          color: #aebbd0;
          font-size: 13px;
          line-height: 1.5;
        }

        .logoutButton {
          height: 40px;
          padding: 0 17px;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 9px;
          background: rgba(255,255,255,.07);
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background .18s ease,
            border-color .18s ease;
        }

        .logoutButton:hover {
          background: rgba(255,255,255,.13);
          border-color: rgba(255,255,255,.32);
        }

        .adminMain {
          padding-top: 28px;
        }

        .message {
          margin-bottom: 18px;
          padding: 13px 16px;
          border: 1px solid #bbf7d0;
          border-radius: 11px;
          background: #f0fdf4;
          color: #166534;
          font-size: 14px;
          font-weight: 650;
        }

        .error {
          margin-bottom: 18px;
          padding: 13px 16px;
          border: 1px solid #fecaca;
          border-radius: 11px;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 14px;
          font-weight: 650;
        }

        .section {
          margin-bottom: 22px;
          padding: 25px;
          border: 1px solid #e1e7ef;
          border-radius: 17px;
          background: #ffffff;
          box-shadow: 0 7px 24px rgba(17,24,39,.045);
        }

        .sectionHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .sectionHeader h1,
        .sectionHeader h2 {
          margin: 0;
          color: #172033;
          font-size: 22px;
          line-height: 1.2;
          letter-spacing: -.45px;
          font-weight: 900;
        }

        .sectionHeader p {
          max-width: 680px;
          margin: 7px 0 0;
          color: #707a8b;
          font-size: 14px;
          line-height: 1.6;
        }

        .adminLink {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          flex-shrink: 0;
          padding: 0 17px;
          border-radius: 10px;
          background: #2563eb;
          color: #ffffff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 850;
          transition:
            background .18s ease,
            transform .18s ease;
        }

        .adminLink:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .form {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 16px;
          padding: 20px;
          border: 1px solid #e6eaf0;
          border-radius: 14px;
          background: #f9fafc;
        }

        .form label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #344054;
          font-size: 13px;
          font-weight: 800;
        }

        .form input,
        .form select {
          width: 100%;
          height: 46px;
          border: 1px solid #d4dae4;
          border-radius: 9px;
          padding: 0 13px;
          background: #ffffff;
          color: #172033;
          font-family: inherit;
          font-size: 14px;
          outline: none;
        }

        .form input:focus,
        .form select:focus {
          border-color: #60a5fa;
          box-shadow:
            0 0 0 3px rgba(96,165,250,.18);
        }

        .form button {
          min-height: 46px;
          align-self: end;
          border: 0;
          border-radius: 9px;
          padding: 0 18px;
          background: #2563eb;
          color: #ffffff;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
        }

        .form button:hover {
          background: #1d4ed8;
        }

        .form button:disabled,
        .sectionHeader button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .sectionHeader > button {
          min-height: 42px;
          flex-shrink: 0;
          border: 0;
          border-radius: 10px;
          padding: 0 17px;
          background: #0b1220;
          color: #ffffff;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
          transition: background .18s ease;
        }

        .sectionHeader > button:hover:not(:disabled) {
          background: #17284a;
        }

        .adminList {
          margin-top: 22px;
        }

        .adminList h3 {
          margin: 0 0 12px;
          color: #172033;
          font-size: 15px;
          font-weight: 900;
        }

        .adminList > p {
          margin: 0;
          padding: 22px;
          border: 1px dashed #d6dce6;
          border-radius: 11px;
          color: #7b8494;
          background: #fafbfc;
          text-align: center;
          font-size: 14px;
        }

        .adminListItem {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 17px;
          border: 1px solid #e3e8ef;
          border-radius: 12px;
          background: #ffffff;
        }

        .adminListItem + .adminListItem {
          margin-top: 10px;
        }

        .sourceInfo {
          min-width: 0;
        }

        .sourceName {
          display: block;
          margin-bottom: 5px;
          color: #172033;
          font-size: 14px;
          font-weight: 850;
        }

        .sourceUrl {
          max-width: 700px;
          margin: 0 0 6px;
          overflow: hidden;
          color: #667085;
          font-size: 12px;
          line-height: 1.5;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sourceMeta {
          color: #8992a2;
          font-size: 11px;
          font-weight: 650;
        }

        .activeBadge {
          color: #15803d;
        }

        .disabledBadge {
          color: #b45309;
        }

        .adminActions {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          gap: 8px;
        }

        .actionButton {
          min-height: 36px;
          border: 1px solid #d9dee7;
          border-radius: 8px;
          padding: 0 12px;
          background: #ffffff;
          color: #344054;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .actionButton:hover {
          border-color: #b9c4d4;
          background: #f8fafc;
        }

        .deleteButton {
          border-color: #fecaca;
          color: #b91c1c;
        }

        .deleteButton:hover {
          border-color: #fca5a5;
          background: #fef2f2;
        }

        .loadingState {
          padding: 25px;
          color: #727c8d;
          text-align: center;
          font-size: 14px;
        }

        .adminGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .quickCard {
          padding: 20px;
          border: 1px solid #e1e7ef;
          border-radius: 14px;
          background: #ffffff;
        }

        .quickLabel {
          margin: 0 0 7px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .7px;
          text-transform: uppercase;
        }

        .quickTitle {
          margin: 0 0 8px;
          color: #172033;
          font-size: 18px;
          font-weight: 900;
        }

        .quickText {
          margin: 0 0 15px;
          color: #737d8d;
          font-size: 13px;
          line-height: 1.55;
        }

        .quickLink {
          color: #2563eb;
          text-decoration: none;
          font-size: 13px;
          font-weight: 850;
        }

        .quickLink:hover {
          text-decoration: underline;
        }

        @media (max-width: 760px) {
          .adminContainer {
            width: min(100% - 22px, 1200px);
          }

          .adminHeaderInner {
            min-height: 74px;
          }

          .adminBrand {
            font-size: 20px;
          }

          .adminSubtitle {
            display: none;
          }

          .section {
            padding: 19px;
          }

          .sectionHeader {
            flex-direction: column;
            gap: 14px;
          }

          .sectionHeader > button,
          .adminLink {
            width: 100%;
          }

          .form {
            grid-template-columns: 1fr;
            padding: 16px;
          }

          .adminListItem {
            align-items: flex-start;
            flex-direction: column;
          }

          .adminActions {
            width: 100%;
          }

          .actionButton {
            flex: 1;
          }
        }

        @media (max-width: 480px) {
          .adminHeaderInner {
            align-items: flex-start;
            padding: 16px 0;
          }

          .logoutButton {
            height: 36px;
          }

          .adminMain {
            padding-top: 18px;
          }

          .sectionHeader h1,
          .sectionHeader h2 {
            font-size: 20px;
          }

          .sourceUrl {
            white-space: normal;
            overflow-wrap: anywhere;
          }
        }
      `}</style>

      <header className="adminHeader">
        <div className="adminContainer adminHeaderInner">
          <div>
            <Link
              href="/admin"
              className="adminBrand"
            >
              JNMulee News Admin
            </Link>

            <p className="adminSubtitle">
              Manage publishing, RSS feeds,
              comments and advertisements
            </p>
          </div>

          <button
            type="button"
            className="logoutButton"
            onClick={logout}
            disabled={loggingOut}
          >
            {loggingOut
              ? "Signing out..."
              : "Logout"}
          </button>
        </div>
      </header>

      <div className="adminContainer adminMain">
        {message && (
          <div
            className="message"
            role="status"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            className="error"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="adminGrid">
          <div className="quickCard">
            <p className="quickLabel">
              Publishing
            </p>

            <h2 className="quickTitle">
              Post News
            </h2>

            <p className="quickText">
              Create your own article, add an
              image and publish it directly to
              JNMulee News.
            </p>

            <Link
              href="/admin/news/new"
              className="quickLink"
            >
              + Create Article →
            </Link>
          </div>

          <div className="quickCard">
            <p className="quickLabel">
              Community
            </p>

            <h2 className="quickTitle">
              Comments
            </h2>

            <p className="quickText">
              Review, approve or delete comments
              submitted by visitors.
            </p>

            <Link
              href="/admin/comments"
              className="quickLink"
            >
              Manage Comments →
            </Link>
          </div>
        </div>

        <section className="section">
          <div className="sectionHeader">
            <div>
              <h2>
                News Sources / RSS Feeds
              </h2>

              <p>
                Connect RSS feeds and choose
                the category where imported
                stories should appear.
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
                maxLength={120}
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
                maxLength={500}
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
            <h3>
              Connected Sources
            </h3>

            {loading ? (
              <div className="loadingState">
                Loading sources...
              </div>
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
                  <div className="sourceInfo">
                    <strong className="sourceName">
                      {source.name}
                    </strong>

                    <p className="sourceUrl">
                      {source.feed_url}
                    </p>

                    <small
                      className={`sourceMeta ${
                        source.active
                          ? "activeBadge"
                          : "disabledBadge"
                      }`}
                    >
                      {source.category} ·{" "}
                      {source.active
                        ? "Active"
                        : "Disabled"}
                    </small>
                  </div>

                  <div className="adminActions">
                    <button
                      type="button"
                      className="actionButton"
                      onClick={() =>
                        toggleSource(source)
                      }
                    >
                      {source.active
                        ? "Disable"
                        : "Enable"}
                    </button>

                    <button
                      type="button"
                      className="actionButton deleteButton"
                      onClick={() =>
                        deleteSource(source.id)
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

        <section className="section">
          <div className="sectionHeader">
            <div>
              <h2>
                Personal Advertisements
              </h2>

              <p>
                Add image advertisements and
                choose where they should appear.
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
                maxLength={150}
              />
            </label>

            <label>
              Advertisement Image URL

              <input
                type="url"
                value={adImageUrl}
                onChange={(e) =>
                  setAdImageUrl(e.target.value)
                }
                placeholder="https://example.com/ad-image.jpg"
                maxLength={1000}
              />
            </label>

            <label>
              Advertisement Link

              <input
                type="url"
                value={adLinkUrl}
                onChange={(e) =>
                  setAdLinkUrl(e.target.value)
                }
                placeholder="https://example.com"
                maxLength={1000}
              />
            </label>

            <label>
              Placement

              <select
                value={adPlacement}
                onChange={(e) =>
                  setAdPlacement(e.target.value)
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