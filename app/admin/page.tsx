"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type NewsRow = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  image_url: string | null;
  Published: boolean | null;
  created_at: string | null;
};

type SourceRow = {
  id: string;
  name: string | null;
  feed_url: string;
  category: string | null;
  active: boolean | null;
};

type DirectAdRow = {
  id: string;
  placement: string;
  title: string | null;
  image_url: string | null;
  link_url: string | null;
  active: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
};

type ImportResult = {
  success?: boolean;
  message?: string;
  batch?: number;
  totalBatches?: number;
  totalSources?: number;
  sourcesProcessed?: number;
  feedItemsSeen?: number;
  articlePagesFetched?: number;
  aiGenerated?: number;
  articlesAddedForApproval?: number;
  articlesSkipped?: number;
  skippedDuplicate?: number;
  skippedNoImage?: number;
  skippedShortSource?: number;
  skippedPoorQuality?: number;
  feedFetchFailed?: number;
  articleFetchFailed?: number;
  aiFailed?: number;
  aiCreditsUnavailable?: boolean;
  diagnostics?: string[];
  error?: string;
};

const CATEGORIES = [
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

const AD_PLACEMENTS = [
  {
    value: "home_top",
    label: "Homepage Top",
  },
  {
    value: "home_between",
    label: "Homepage Between Stories",
  },
  {
    value: "home_bottom",
    label: "Homepage Bottom",
  },
  {
    value: "article_top",
    label: "Article Top",
  },
  {
    value: "article_middle",
    label: "Article Middle",
  },
  {
    value: "article_bottom",
    label: "Article Bottom",
  },
];

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [userEmail, setUserEmail] = useState("");

  const [news, setNews] = useState<NewsRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [ads, setAds] = useState<DirectAdRow[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [importProgress, setImportProgress] = useState("");
  const [importStats, setImportStats] = useState<ImportResult | null>(
    null
  );

  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceCategory, setSourceCategory] = useState("News");

  const [adPlacement, setAdPlacement] = useState("home_top");
  const [adTitle, setAdTitle] = useState("");
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adLinkUrl, setAdLinkUrl] = useState("");

  async function loadData() {
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserEmail(user.email || "");

      const role = user.app_metadata?.role;

      if (role !== "admin") {
        setError("You do not have administrator access.");
        setLoading(false);
        return;
      }

      const [
        newsResult,
        sourcesResult,
        adsResult,
      ] = await Promise.all([
        supabase
          .from("news")
          .select(
            "id,title,slug,category,image_url,Published,created_at"
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(100),

        supabase
          .from("sources")
          .select(
            "id,name,feed_url,category,active"
          )
          .order("name", {
            ascending: true,
          }),

        supabase
          .from("direct_ads")
          .select(
            "id,placement,title,image_url,link_url,active,starts_at,ends_at"
          )
          .order("placement", {
            ascending: true,
          }),
      ]);

      if (newsResult.error) {
        throw new Error(
          `News: ${newsResult.error.message}`
        );
      }

      if (sourcesResult.error) {
        throw new Error(
          `Sources: ${sourcesResult.error.message}`
        );
      }

      if (adsResult.error) {
        throw new Error(
          `Ads: ${adsResult.error.message}`
        );
      }

      setNews(
        (newsResult.data || []) as NewsRow[]
      );

      setSources(
        (sourcesResult.data || []) as SourceRow[]
      );

      setAds(
        (adsResult.data || []) as DirectAdRow[]
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load admin data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function getAccessToken() {
    const {
      data,
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(
        sessionError.message
      );
    }

    const token =
      data.session?.access_token;

    if (!token) {
      throw new Error(
        "Your admin session has expired. Please sign in again."
      );
    }

    return token;
  }

  async function importBatch(
    token: string,
    batch: number
  ): Promise<ImportResult> {
    const response = await fetch(
      `/api/fetch-news?manual=true&batch=${batch}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data =
      (await response.json()) as ImportResult;

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          `Importer returned HTTP ${response.status}`
      );
    }

    return data;
  }

  async function runImportAll() {
    setWorking(true);
    setError("");
    setMessage("");
    setImportStats(null);
    setImportProgress(
      "Starting news import..."
    );

    try {
      const token =
        await getAccessToken();

      /*
       * First request tells us how many batches exist.
       */
      const first =
        await importBatch(token, 0);

      const totalBatches =
        Math.max(
          1,
          first.totalBatches || 1
        );

      const combined: ImportResult = {
        success: true,
        totalBatches,
        totalSources:
          first.totalSources || 0,
        sourcesProcessed:
          first.sourcesProcessed || 0,
        feedItemsSeen:
          first.feedItemsSeen || 0,
        articlePagesFetched:
          first.articlePagesFetched || 0,
        aiGenerated:
          first.aiGenerated || 0,
        articlesAddedForApproval:
          first.articlesAddedForApproval || 0,
        articlesSkipped:
          first.articlesSkipped || 0,
        skippedDuplicate:
          first.skippedDuplicate || 0,
        skippedNoImage:
          first.skippedNoImage || 0,
        skippedShortSource:
          first.skippedShortSource || 0,
        skippedPoorQuality:
          first.skippedPoorQuality || 0,
        feedFetchFailed:
          first.feedFetchFailed || 0,
        articleFetchFailed:
          first.articleFetchFailed || 0,
        aiFailed:
          first.aiFailed || 0,
        aiCreditsUnavailable:
          first.aiCreditsUnavailable || false,
        diagnostics:
          first.diagnostics || [],
      };

      setImportStats({
        ...combined,
      });

      setImportProgress(
        `Completed batch 1 of ${totalBatches}`
      );

      /*
       * If there is only one batch, we're finished.
       */
      if (
        combined.aiCreditsUnavailable
      ) {
        setMessage(
          "Import stopped because OpenAI credits/quota are unavailable."
        );

        await loadData();
        return;
      }

      /*
       * Run remaining batches.
       */
      for (
        let batch = 1;
        batch < totalBatches;
        batch++
      ) {
        setImportProgress(
          `Importing batch ${
            batch + 1
          } of ${totalBatches}...`
        );

        const result =
          await importBatch(
            token,
            batch
          );

        combined.sourcesProcessed =
          (combined.sourcesProcessed || 0) +
          (result.sourcesProcessed || 0);

        combined.feedItemsSeen =
          (combined.feedItemsSeen || 0) +
          (result.feedItemsSeen || 0);

        combined.articlePagesFetched =
          (combined.articlePagesFetched || 0) +
          (result.articlePagesFetched || 0);

        combined.aiGenerated =
          (combined.aiGenerated || 0) +
          (result.aiGenerated || 0);

        combined.articlesAddedForApproval =
          (combined.articlesAddedForApproval || 0) +
          (result.articlesAddedForApproval || 0);

        combined.articlesSkipped =
          (combined.articlesSkipped || 0) +
          (result.articlesSkipped || 0);

        combined.skippedDuplicate =
          (combined.skippedDuplicate || 0) +
          (result.skippedDuplicate || 0);

        combined.skippedNoImage =
          (combined.skippedNoImage || 0) +
          (result.skippedNoImage || 0);

        combined.skippedShortSource =
          (combined.skippedShortSource || 0) +
          (result.skippedShortSource || 0);

        combined.skippedPoorQuality =
          (combined.skippedPoorQuality || 0) +
          (result.skippedPoorQuality || 0);

        combined.feedFetchFailed =
          (combined.feedFetchFailed || 0) +
          (result.feedFetchFailed || 0);

        combined.articleFetchFailed =
          (combined.articleFetchFailed || 0) +
          (result.articleFetchFailed || 0);

        combined.aiFailed =
          (combined.aiFailed || 0) +
          (result.aiFailed || 0);

        combined.aiCreditsUnavailable =
          Boolean(
            combined.aiCreditsUnavailable ||
              result.aiCreditsUnavailable
          );

        combined.diagnostics = [
          ...(combined.diagnostics || []),
          ...(result.diagnostics || []),
        ];

        setImportStats({
          ...combined,
        });

        if (
          result.aiCreditsUnavailable
        ) {
          setMessage(
            "Import stopped because OpenAI credits/quota are unavailable."
          );
          break;
        }

        setImportProgress(
          `Completed batch ${
            batch + 1
          } of ${totalBatches}`
        );
      }

      if (
        !combined.aiCreditsUnavailable
      ) {
        setMessage(
          `Import completed. ${combined.articlesAddedForApproval || 0} new article(s) were added for approval.`
        );
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "News import failed."
      );
    } finally {
      setWorking(false);
    }
  }

  async function addSource() {
    if (!sourceName.trim()) {
      setError(
        "Enter a source name."
      );
      return;
    }

    if (!sourceUrl.trim()) {
      setError(
        "Enter the RSS/Atom feed URL."
      );
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const { error: insertError } =
        await supabase
          .from("sources")
          .insert({
            name: sourceName.trim(),
            feed_url: sourceUrl.trim(),
            category: sourceCategory,
            active: true,
          });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      setSourceName("");
      setSourceUrl("");
      setSourceCategory("News");

      setMessage(
        "News source added successfully."
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add source."
      );
    } finally {
      setWorking(false);
    }
  }

  async function toggleSource(
    source: SourceRow
  ) {
    setError("");
    setMessage("");

    const { error: updateError } =
      await supabase
        .from("sources")
        .update({
          active: !source.active,
        })
        .eq("id", source.id);

    if (updateError) {
      setError(
        updateError.message
      );
      return;
    }

    await loadData();
  }

  async function deleteSource(
    source: SourceRow
  ) {
    const confirmed =
      window.confirm(
        `Delete "${source.name || "this source"}"?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const { error: deleteError } =
      await supabase
        .from("sources")
        .delete()
        .eq("id", source.id);

    if (deleteError) {
      setError(
        deleteError.message
      );
      return;
    }

    setMessage(
      "Source deleted."
    );

    await loadData();
  }

  async function togglePublished(
    item: NewsRow
  ) {
    setError("");
    setMessage("");

    const { error: updateError } =
      await supabase
        .from("news")
        .update({
          Published: !item.Published,
        })
        .eq("id", item.id);

    if (updateError) {
      setError(
        updateError.message
      );
      return;
    }

    await loadData();
  }

  async function deleteNews(
    item: NewsRow
  ) {
    const confirmed =
      window.confirm(
        `Delete "${item.title}"?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const { error: deleteError } =
      await supabase
        .from("news")
        .delete()
        .eq("id", item.id);

    if (deleteError) {
      setError(
        deleteError.message
      );
      return;
    }

    setMessage(
      "Article deleted."
    );

    await loadData();
  }

  async function addAd() {
    if (!adTitle.trim()) {
      setError(
        "Enter an ad title."
      );
      return;
    }

    if (!adImageUrl.trim()) {
      setError(
        "Enter the ad image URL."
      );
      return;
    }

    if (!adLinkUrl.trim()) {
      setError(
        "Enter the ad destination URL."
      );
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const { error: insertError } =
        await supabase
          .from("direct_ads")
          .insert({
            placement: adPlacement,
            title: adTitle.trim(),
            image_url:
              adImageUrl.trim(),
            link_url:
              adLinkUrl.trim(),
            active: true,
          });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      setAdTitle("");
      setAdImageUrl("");
      setAdLinkUrl("");

      setMessage(
        "Direct advertisement added."
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add advertisement."
      );
    } finally {
      setWorking(false);
    }
  }

  async function toggleAd(
    ad: DirectAdRow
  ) {
    setError("");
    setMessage("");

    const { error: updateError } =
      await supabase
        .from("direct_ads")
        .update({
          active: !ad.active,
        })
        .eq("id", ad.id);

    if (updateError) {
      setError(
        updateError.message
      );
      return;
    }

    await loadData();
  }

  async function deleteAd(
    ad: DirectAdRow
  ) {
    const confirmed =
      window.confirm(
        `Delete "${ad.title || "this advertisement"}"?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const { error: deleteError } =
      await supabase
        .from("direct_ads")
        .delete()
        .eq("id", ad.id);

    if (deleteError) {
      setError(
        deleteError.message
      );
      return;
    }

    setMessage(
      "Advertisement deleted."
    );

    await loadData();
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-lg">
            Loading admin dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (error && !userEmail) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="mb-3 text-2xl font-bold">
            Admin Access
          </h1>

          <p className="text-red-300">
            {error}
          </p>

          <button
            onClick={() =>
              (window.location.href =
                "/login")
            }
            className="mt-5 rounded-lg bg-white px-5 py-3 font-semibold text-slate-950"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-400">
              JNMulee News
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Admin Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              {userEmail}
            </p>
          </div>

          <button
            onClick={signOut}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Sign Out
          </button>
        </header>

        {/* MESSAGES */}
        {message && (
          <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* IMPORT */}
        <section className="mb-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                News Importer
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Fetch RSS/Atom feeds, extract article
                content, require an image, generate the
                rewritten article, and save it as
                unpublished for approval.
              </p>
            </div>

            <button
              onClick={runImportAll}
              disabled={working}
              className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {working
                ? "Importing..."
                : "Import All News Now"}
            </button>
          </div>

          {importProgress && (
            <div className="mt-4 rounded-lg bg-black/20 p-3 text-sm text-cyan-300">
              {importProgress}
            </div>
          )}

          {importStats && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat
                label="Feed Items"
                value={
                  importStats.feedItemsSeen || 0
                }
              />

              <Stat
                label="AI Generated"
                value={
                  importStats.aiGenerated || 0
                }
              />

              <Stat
                label="Added"
                value={
                  importStats.articlesAddedForApproval ||
                  0
                }
              />

              <Stat
                label="Duplicates"
                value={
                  importStats.skippedDuplicate ||
                  0
                }
              />

              <Stat
                label="No Image"
                value={
                  importStats.skippedNoImage ||
                  0
                }
              />

              <Stat
                label="AI Failed"
                value={
                  importStats.aiFailed || 0
                }
              />
            </div>
          )}

          {importStats?.aiCreditsUnavailable && (
            <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-300">
              OpenAI credits/quota are unavailable.
              News cannot be AI-generated until the
              OpenAI API account has available credits.
            </div>
          )}

          {importStats?.diagnostics &&
            importStats.diagnostics.length >
              0 && (
              <details className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                <summary className="cursor-pointer font-semibold">
                  Import diagnostics
                </summary>

                <div className="mt-4 max-h-96 overflow-auto rounded-lg bg-black/30 p-3">
                  {importStats.diagnostics.map(
                    (line, index) => (
                      <div
                        key={`${index}-${line}`}
                        className="border-b border-white/5 py-1 text-xs text-slate-300 last:border-0"
                      >
                        {line}
                      </div>
                    )
                  )}
                </div>
              </details>
            )}
        </section>

        {/* DASHBOARD COUNTS */}
        <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <DashboardCard
            title="Articles Loaded"
            value={news.length}
          />

          <DashboardCard
            title="Sources"
            value={sources.length}
          />

          <DashboardCard
            title="Active Sources"
            value={
              sources.filter(
                (source) =>
                  source.active
              ).length
            }
          />

          <DashboardCard
            title="Active Ads"
            value={
              ads.filter(
                (ad) => ad.active
              ).length
            }
          />
        </section>

        {/* ADD SOURCE */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-4 text-xl font-bold">
            Add News Source
          </h2>

          <div className="grid gap-3 md:grid-cols-4">
            <input
              value={sourceName}
              onChange={(event) =>
                setSourceName(
                  event.target.value
                )
              }
              placeholder="Source name"
              className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />

            <input
              value={sourceUrl}
              onChange={(event) =>
                setSourceUrl(
                  event.target.value
                )
              }
              placeholder="RSS / Atom feed URL"
              className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-500 md:col-span-2"
            />

            <select
              value={sourceCategory}
              onChange={(event) =>
                setSourceCategory(
                  event.target.value
                )
              }
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            >
              {CATEGORIES.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}
            </select>
          </div>

          <button
            onClick={addSource}
            disabled={working}
            className="mt-4 rounded-lg bg-white px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
          >
            Add Source
          </button>
        </section>

        {/* SOURCES */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              News Sources
            </h2>

            <span className="text-sm text-slate-400">
              {sources.length} total
            </span>
          </div>

          <div className="space-y-3">
            {sources.map(
              (source) => (
                <div
                  key={source.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {source.name ||
                            "Unnamed source"}
                        </h3>

                        <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                          {source.category ||
                            "News"}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            source.active
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-red-400/10 text-red-300"
                          }`}
                        >
                          {source.active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-2 break-all text-xs text-slate-500">
                        {source.feed_url}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() =>
                          toggleSource(
                            source
                          )
                        }
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/10"
                      >
                        {source.active
                          ? "Disable"
                          : "Enable"}
                      </button>

                      <button
                        onClick={() =>
                          deleteSource(
                            source
                          )
                        }
                        className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-400/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}

            {sources.length === 0 && (
              <p className="py-8 text-center text-slate-500">
                No news sources found.
              </p>
            )}
          </div>
        </section>

        {/* ARTICLES */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Latest Articles
            </h2>

            <span className="text-sm text-slate-400">
              Showing latest 100
            </span>
          </div>

          <div className="space-y-3">
            {news.map(
              (item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt=""
                        className="h-24 w-full rounded-lg object-cover sm:w-36"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">
                        {item.title}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-white/10 px-2 py-1 text-slate-300">
                          {item.category ||
                            "News"}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 ${
                            item.Published
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-amber-400/10 text-amber-300"
                          }`}
                        >
                          {item.Published
                            ? "Published"
                            : "Pending"}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2 sm:flex-col">
                      <button
                        onClick={() =>
                          togglePublished(
                            item
                          )
                        }
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/10"
                      >
                        {item.Published
                          ? "Unpublish"
                          : "Publish"}
                      </button>

                      <button
                        onClick={() =>
                          deleteNews(
                            item
                          )
                        }
                        className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-400/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}

            {news.length === 0 && (
              <p className="py-8 text-center text-slate-500">
                No articles found.
              </p>
            )}
          </div>
        </section>

        {/* ADS */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-4 text-xl font-bold">
            Direct Advertisements
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={adTitle}
              onChange={(event) =>
                setAdTitle(
                  event.target.value
                )
              }
              placeholder="Ad title"
              className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />

            <select
              value={adPlacement}
              onChange={(event) =>
                setAdPlacement(
                  event.target.value
                )
              }
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            >
              {AD_PLACEMENTS.map(
                (placement) => (
                  <option
                    key={
                      placement.value
                    }
                    value={
                      placement.value
                    }
                  >
                    {placement.label}
                  </option>
                )
              )}
            </select>

            <input
              value={adImageUrl}
              onChange={(event) =>
                setAdImageUrl(
                  event.target.value
                )
              }
              placeholder="Ad image URL"
              className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />

            <input
              value={adLinkUrl}
              onChange={(event) =>
                setAdLinkUrl(
                  event.target.value
                )
              }
              placeholder="Destination URL"
              className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <button
            onClick={addAd}
            disabled={working}
            className="mt-4 rounded-lg bg-white px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
          >
            Add Advertisement
          </button>

          <div className="mt-6 space-y-3">
            {ads.map(
              (ad) => (
                <div
                  key={ad.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold">
                        {ad.title ||
                          "Untitled advertisement"}
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        {AD_PLACEMENTS.find(
                          (item) =>
                            item.value ===
                            ad.placement
                        )?.label ||
                          ad.placement}
                      </p>

                      {ad.link_url && (
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {ad.link_url}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          toggleAd(ad)
                        }
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/10"
                      >
                        {ad.active
                          ? "Disable"
                          : "Enable"}
                      </button>

                      <button
                        onClick={() =>
                          deleteAd(ad)
                        }
                        className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-400/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}

            {ads.length === 0 && (
              <p className="py-6 text-center text-slate-500">
                No direct advertisements yet.
              </p>
            )}
          </div>
        </section>

        <footer className="pb-10 text-center text-xs text-slate-600">
          JNMulee News Admin
        </footer>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}