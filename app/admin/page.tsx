"use client";

import { useCallback, useEffect, useState } from "react";
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
  { value: "home_top", label: "Homepage Top" },
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

const cyanButton =
  "rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-400/10 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";

const smallButton =
  "rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50";

const deleteButton =
  "rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:bg-slate-700 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10";

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
  const [importStats, setImportStats] =
    useState<ImportResult | null>(null);

  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceCategory, setSourceCategory] =
    useState("News");

  const [adPlacement, setAdPlacement] =
    useState("home_top");
  const [adTitle, setAdTitle] = useState("");
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adLinkUrl, setAdLinkUrl] = useState("");

  const [activeSection, setActiveSection] =
    useState("dashboard");

  const clearNotice = () => {
    setMessage("");
    setError("");
  };

  const loadData = useCallback(async () => {
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        window.location.replace("/admin/login");
        return;
      }

      setUserEmail(user.email || "");

      const role = user.app_metadata?.role;

      if (role !== "admin") {
        setError(
          "You do not have administrator access."
        );
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function getAccessToken() {
    const {
      data,
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(sessionError.message);
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

    let data: ImportResult = {};

    try {
      data =
        (await response.json()) as ImportResult;
    } catch {
      throw new Error(
        `Importer returned HTTP ${response.status}.`
      );
    }

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
    if (working) return;

    setWorking(true);
    clearNotice();
    setImportStats(null);
    setImportProgress(
      "Starting news import..."
    );

    try {
      const token =
        await getAccessToken();

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

      if (
        combined.aiCreditsUnavailable
      ) {
        setMessage(
          "Import stopped because OpenAI credits/quota are unavailable."
        );

        await loadData();
        return;
      }

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
          `Import completed. ${
            combined.articlesAddedForApproval ||
            0
          } new article(s) were added for approval.`
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
    clearNotice();

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
    clearNotice();

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

    setMessage(
      source.active
        ? "Source disabled."
        : "Source enabled."
    );

    await loadData();
  }

  async function deleteSource(
    source: SourceRow
  ) {
    const confirmed =
      window.confirm(
        `Delete "${
          source.name || "this source"
        }"?`
      );

    if (!confirmed) return;

    clearNotice();

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

    setMessage("Source deleted.");
    await loadData();
  }

  async function togglePublished(
    item: NewsRow
  ) {
    clearNotice();

    if (
      !item.Published &&
      !item.image_url
    ) {
      setError(
        "This article cannot be published because it does not have an image."
      );
      return;
    }

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

    setMessage(
      item.Published
        ? "Article unpublished."
        : "Article published."
    );

    await loadData();
  }

  async function deleteNews(
    item: NewsRow
  ) {
    const confirmed =
      window.confirm(
        `Delete "${item.title}"?`
      );

    if (!confirmed) return;

    clearNotice();

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

    setMessage("Article deleted.");
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
    clearNotice();

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
    clearNotice();

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

    setMessage(
      ad.active
        ? "Advertisement disabled."
        : "Advertisement enabled."
    );

    await loadData();
  }

  async function deleteAd(
    ad: DirectAdRow
  ) {
    const confirmed =
      window.confirm(
        `Delete "${
          ad.title ||
          "this advertisement"
        }"?`
      );

    if (!confirmed) return;

    clearNotice();

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
    window.location.replace(
      "/admin/login"
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />

          <p className="text-lg text-slate-300">
            Loading admin dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (error && !userEmail) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-cyan-400/20 bg-white/[0.04] p-6 shadow-2xl">
          <div className="mb-4 text-sm font-bold text-cyan-300">
            JNMulee News
          </div>

          <h1 className="mb-3 text-2xl font-black">
            Admin Access
          </h1>

          <p className="text-slate-300">
            {error}
          </p>

          <button
            onClick={() =>
              window.location.replace(
                "/admin/login"
              )
            }
            className={`${cyanButton} mt-5`}
          >
            Go to Admin Login
          </button>
        </div>
      </main>
    );
  }

  const publishedCount = news.filter(
    (item) =>
      item.Published === true
  ).length;

  const pendingCount = news.filter(
    (item) =>
      item.Published !== true
  ).length;

  const activeSources = sources.filter(
    (item) => item.active === true
  ).length;

  const activeAds = ads.filter(
    (item) => item.active === true
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <header className="mb-6 overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />

                <p className="text-sm font-black tracking-wide text-cyan-300">
                  JNMulee News
                </p>
              </div>

              <h1 className="mt-1 text-3xl font-black tracking-tight">
                Admin Dashboard
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                {userEmail}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className={smallButton}
              >
                View Website
              </a>

              <a
                href="/admin/workers"
                className={smallButton}
              >
                Workers
              </a>

              <button
                onClick={signOut}
                className={smallButton}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* ADMIN NAV */}
        <nav className="mb-8 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-2">
          <div className="flex min-w-max gap-2">
            {[
              ["dashboard", "Dashboard"],
              ["import", "News Import"],
              ["sources", "Sources"],
              ["articles", "Articles"],
              ["ads", "Advertisements"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  setActiveSection(value)
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  activeSection === value
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-200"
                }`}
              >
                {label}
              </button>
            ))}

            <a
              href="/admin/workers"
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-cyan-400/10 hover:text-cyan-200"
            >
              Workers
            </a>
          </div>
        </nav>

        {message && (
          <div className="mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm font-semibold text-cyan-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-cyan-400/20 bg-slate-900 p-4 text-sm text-cyan-100">
            <span className="font-bold text-cyan-300">
              Notice:
            </span>{" "}
            {error}
          </div>
        )}

        {/* DASHBOARD */}
        {activeSection === "dashboard" && (
          <>
            <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardCard
                title="Published Stories"
                value={publishedCount}
              />

              <DashboardCard
                title="Pending Stories"
                value={pendingCount}
              />

              <DashboardCard
                title="Active Sources"
                value={activeSources}
              />

              <DashboardCard
                title="Active Ads"
                value={activeAds}
              />
            </section>

            <section className="mb-8 grid gap-5 lg:grid-cols-2">
              <QuickCard
                title="News Import"
                description="Fetch active feeds and process available articles."
                button="Open Import"
                onClick={() =>
                  setActiveSection("import")
                }
              />

              <QuickCard
                title="Workers"
                description="Create staff accounts so trusted workers can manage news while you are offline."
                button="Manage Workers"
                href="/admin/workers"
              />

              <QuickCard
                title="Sources"
                description="Add, enable, disable and remove your RSS/Atom feeds."
                button="Manage Sources"
                onClick={() =>
                  setActiveSection("sources")
                }
              />

              <QuickCard
                title="Advertisements"
                description="Manage your direct advertisements and placements."
                button="Manage Ads"
                onClick={() =>
                  setActiveSection("ads")
                }
              />
            </section>
          </>
        )}

        {/* IMPORT */}
        {activeSection === "import" && (
          <section className="mb-8 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.07] to-white/[0.02] p-5 shadow-xl shadow-black/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-cyan-400">
                  NEWS IMPORT
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Import Latest News
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Fetch active feeds and process available articles.
                </p>
              </div>

              <button
                onClick={runImportAll}
                disabled={working}
                className={cyanButton}
              >
                {working
                  ? "Importing..."
                  : "Import News"}
              </button>
            </div>

            {importProgress && (
              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm text-cyan-200">
                {importProgress}
              </div>
            )}

            {importStats && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Sources"
                  value={
                    importStats.sourcesProcessed ||
                    0
                  }
                />

                <Stat
                  label="Feed Items"
                  value={
                    importStats.feedItemsSeen ||
                    0
                  }
                />

                <Stat
                  label="Articles Added"
                  value={
                    importStats.articlesAddedForApproval ||
                    0
                  }
                />

                <Stat
                  label="Skipped"
                  value={
                    importStats.articlesSkipped ||
                    0
                  }
                />
              </div>
            )}

            {importStats?.aiCreditsUnavailable && (
              <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-200">
                OpenAI credits/quota are currently unavailable. Feed fetching can still be checked, but AI processing will stop until the quota is available.
              </div>
            )}

            {importStats?.diagnostics &&
              importStats.diagnostics.length > 0 && (
                <details className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <summary className="cursor-pointer text-sm font-bold text-cyan-300">
                    Import diagnostics
                  </summary>

                  <div className="mt-3 space-y-2">
                    {importStats.diagnostics
                      .slice(0, 30)
                      .map(
                        (item, index) => (
                          <p
                            key={`${index}-${item}`}
                            className="text-xs text-slate-400"
                          >
                            {item}
                          </p>
                        )
                      )}
                  </div>
                </details>
              )}
          </section>
        )}

        {/* SOURCES */}
        {activeSection === "sources" && (
          <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10">
            <div className="mb-5">
              <p className="text-xs font-bold tracking-widest text-cyan-400">
                SOURCES
              </p>

              <h2 className="mt-1 text-xl font-black">
                News Sources
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <input
                value={sourceName}
                onChange={(event) =>
                  setSourceName(
                    event.target.value
                  )
                }
                placeholder="Source name"
                className={inputClass}
              />

              <input
                value={sourceUrl}
                onChange={(event) =>
                  setSourceUrl(
                    event.target.value
                  )
                }
                placeholder="RSS/Atom feed URL"
                className={inputClass}
              />

              <select
                value={sourceCategory}
                onChange={(event) =>
                  setSourceCategory(
                    event.target.value
                  )
                }
                className={inputClass}
              >
                {CATEGORIES.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                      className="bg-slate-900"
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
              className={`${cyanButton} mt-4`}
            >
              Add Source
            </button>

            <div className="mt-6 space-y-3">
              {sources.map(
                (source) => (
                  <div
                    key={source.id}
                    className="rounded-xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-cyan-400/20"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold">
                            {source.name ||
                              "Unnamed source"}
                          </h3>

                          <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                            {source.category ||
                              "News"}
                          </span>

                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              source.active
                                ? "bg-cyan-400/10 text-cyan-300"
                                : "bg-slate-700 text-slate-400"
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
                          className={smallButton}
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
                          className={deleteButton}
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
        )}

        {/* ARTICLES */}
        {activeSection === "articles" && (
          <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-cyan-400">
                  CONTENT
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Latest Articles
                </h2>
              </div>

              <span className="text-sm text-slate-400">
                Showing latest 100
              </span>
            </div>

            <div className="space-y-3">
              {news.map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-cyan-400/20"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt=""
                          className="h-24 w-full rounded-lg object-cover ring-1 ring-white/10 sm:w-36"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold">
                          {item.title}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-white/10 px-2 py-1 text-slate-300">
                            {item.category ||
                              "News"}
                          </span>

                          <span
                            className={`rounded-full px-2 py-1 font-semibold ${
                              item.Published
                                ? "bg-cyan-400/10 text-cyan-300"
                                : "bg-slate-700 text-slate-400"
                            }`}
                          >
                            {item.Published
                              ? "Published"
                              : "Pending"}
                          </span>

                          {!item.image_url && (
                            <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-400">
                              No image
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2 sm:flex-col">
                        <button
                          onClick={() =>
                            togglePublished(
                              item
                            )
                          }
                          disabled={
                            !item.Published &&
                            !item.image_url
                          }
                          className={smallButton}
                          title={
                            !item.Published &&
                            !item.image_url
                              ? "An image is required before publishing."
                              : ""
                          }
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
                          className={deleteButton}
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
        )}

        {/* ADS */}
        {activeSection === "ads" && (
          <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10">
            <div className="mb-4">
              <p className="text-xs font-bold tracking-widest text-cyan-400">
                MONETIZATION
              </p>

              <h2 className="mt-1 text-xl font-black">
                Direct Advertisements
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Manage your own advertising placements.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={adTitle}
                onChange={(event) =>
                  setAdTitle(
                    event.target.value
                  )
                }
                placeholder="Ad title"
                className={inputClass}
              />

              <select
                value={adPlacement}
                onChange={(event) =>
                  setAdPlacement(
                    event.target.value
                  )
                }
                className={inputClass}
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
                      className="bg-slate-900"
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
                className={inputClass}
              />

              <input
                value={adLinkUrl}
                onChange={(event) =>
                  setAdLinkUrl(
                    event.target.value
                  )
                }
                placeholder="Destination URL"
                className={inputClass}
              />
            </div>

            <button
              onClick={addAd}
              disabled={working}
              className={`${cyanButton} mt-4`}
            >
              Add Advertisement
            </button>

            <div className="mt-6 space-y-3">
              {ads.map(
                (ad) => (
                  <div
                    key={ad.id}
                    className="rounded-xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-cyan-400/20"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-bold">
                          {ad.title ||
                            "Untitled advertisement"}
                        </h3>

                        <p className="mt-1 text-xs text-cyan-300">
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
                          className={smallButton}
                        >
                          {ad.active
                            ? "Disable"
                            : "Enable"}
                        </button>

                        <button
                          onClick={() =>
                            deleteAd(ad)
                          }
                          className={deleteButton}
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
        )}

        <footer className="border-t border-white/5 pb-10 pt-5 text-center text-xs text-slate-600">
          <span className="text-cyan-500">
            JNMulee
          </span>{" "}
          News Admin
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
    <div className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 shadow-xl shadow-black/10 transition hover:border-cyan-400/20">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-white transition group-hover:text-cyan-300">
        {value}
      </p>

      <div className="mt-4 h-1 w-10 rounded-full bg-cyan-400/60" />
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
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-cyan-200">
        {value}
      </p>
    </div>
  );
}

function QuickCard({
  title,
  description,
  button,
  onClick,
  href,
}: {
  title: string;
  description: string;
  button: string;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      <div>
        <p className="text-lg font-black text-white">
          {title}
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>

      <span className="mt-5 inline-flex rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-sm font-bold text-cyan-200 transition group-hover:border-cyan-400/40 group-hover:bg-cyan-400/10">
        {button}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.03]"
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.03]"
    >
      {content}
    </button>
  );
}