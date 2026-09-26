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
  {
    value: "home_top",
    label: "Homepage — Top",
  },
  {
    value: "home_between",
    label: "Homepage — Between Stories",
  },
  {
    value: "home_bottom",
    label: "Homepage — Bottom",
  },
  {
    value: "article_top",
    label: "Article — Top",
  },
  {
    value: "article_middle",
    label: "Article — Middle",
  },
  {
    value: "article_bottom",
    label: "Article — Bottom",
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

type ImportResponse = {
  success?: boolean;
  message?: string;
  error?: string;

  batch?: number;
  totalSources?: number;
  totalBatches?: number;

  articlesAddedForApproval?: number;
  articlesPublished?: number;
  articlesSkipped?: number;

  skippedNoImage?: number;
  skippedShortSource?: number;
  skippedDuplicate?: number;
  skippedPoorQuality?: number;

  aiGenerated?: number;
  aiCreditsUnavailable?: boolean;

  sourcesProcessed?: number;
  feedItemsSeen?: number;
  articlePagesFetched?: number;

  durationMs?: number;

  errors?: string[];
};

export default function AdminDashboard() {
  const router = useRouter();

  const [sources, setSources] =
    useState<Source[]>([]);

  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [category, setCategory] =
    useState("Top Stories");

  const [adTitle, setAdTitle] = useState("");
  const [adImageUrl, setAdImageUrl] =
    useState("");
  const [adLinkUrl, setAdLinkUrl] =
    useState("");
  const [adPlacement, setAdPlacement] =
    useState("home_top");

  const [loading, setLoading] =
    useState(true);

  const [addingSource, setAddingSource] =
    useState(false);

  const [addingAd, setAddingAd] =
    useState(false);

  const [importing, setImporting] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [importProgress, setImportProgress] =
    useState("");

  async function checkAuthentication() {
    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      router.replace("/admin/login");
      return false;
    }

    if (
      user.app_metadata?.role !==
      "admin"
    ) {
      await supabase.auth.signOut();
      router.replace("/");
      return false;
    }

    return true;
  }

  async function loadData() {
    setLoading(true);
    setError("");

    const authenticated =
      await checkAuthentication();

    if (!authenticated) {
      setLoading(false);
      return;
    }

    const { data, error } =
      await supabase
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
      setSources(
        (data || []) as Source[]
      );
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

    const authenticated =
      await checkAuthentication();

    if (!authenticated) {
      setAddingSource(false);
      return;
    }

    const cleanName =
      name.trim();

    const cleanFeedUrl =
      feedUrl.trim();

    if (
      !cleanName ||
      !cleanFeedUrl
    ) {
      setError(
        "Please enter the source name and RSS feed URL."
      );

      setAddingSource(false);
      return;
    }

    try {
      const parsedUrl =
        new URL(
          cleanFeedUrl
        );

      if (
        parsedUrl.protocol !==
          "http:" &&
        parsedUrl.protocol !==
          "https:"
      ) {
        throw new Error(
          "Invalid protocol"
        );
      }
    } catch {
      setError(
        "Please enter a valid RSS feed URL."
      );

      setAddingSource(false);
      return;
    }

    const { error } =
      await supabase
        .from("sources")
        .insert({
          name: cleanName,
          feed_url:
            cleanFeedUrl,
          category,
          active: true,
        });

    if (error) {
      setError(
        error.message
      );
    } else {
      setMessage(
        "News source added successfully."
      );

      setName("");
      setFeedUrl("");
      setCategory(
        "Top Stories"
      );

      await loadData();
    }

    setAddingSource(false);
  }

  async function deleteSource(
    id: string
  ) {
    if (
      !window.confirm(
        "Delete this news source? This action cannot be undone."
      )
    ) {
      return;
    }

    setMessage("");
    setError("");

    const authenticated =
      await checkAuthentication();

    if (!authenticated) return;

    const { error } =
      await supabase
        .from("sources")
        .delete()
        .eq("id", id);

    if (error) {
      setError(
        error.message
      );
    } else {
      setMessage(
        "News source deleted."
      );

      await loadData();
    }
  }

  async function toggleSource(
    source: Source
  ) {
    setMessage("");
    setError("");

    const authenticated =
      await checkAuthentication();

    if (!authenticated) return;

    const { error } =
      await supabase
        .from("sources")
        .update({
          active:
            !source.active,
        })
        .eq(
          "id",
          source.id
        );

    if (error) {
      setError(
        error.message
      );
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

    const authenticated =
      await checkAuthentication();

    if (!authenticated) {
      setAddingAd(false);
      return;
    }

    const cleanTitle =
      adTitle.trim();

    const cleanImageUrl =
      adImageUrl.trim();

    const cleanLinkUrl =
      adLinkUrl.trim();

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
      const imageUrl =
        new URL(
          cleanImageUrl
        );

      const linkUrl =
        new URL(
          cleanLinkUrl
        );

      if (
        ![
          "http:",
          "https:",
        ].includes(
          imageUrl.protocol
        ) ||
        ![
          "http:",
          "https:",
        ].includes(
          linkUrl.protocol
        )
      ) {
        throw new Error(
          "Invalid protocol"
        );
      }
    } catch {
      setError(
        "Please enter valid advertisement image and link URLs."
      );

      setAddingAd(false);
      return;
    }

    const { error } =
      await supabase
        .from("direct_ads")
        .insert({
          title: cleanTitle,
          image_url:
            cleanImageUrl,
          link_url:
            cleanLinkUrl,
          placement:
            adPlacement,
          active: true,
        });

    if (error) {
      setError(
        error.message
      );
    } else {
      setMessage(
        "Personal advertisement added successfully."
      );

      setAdTitle("");
      setAdImageUrl("");
      setAdLinkUrl("");
      setAdPlacement(
        "home_top"
      );
    }

    setAddingAd(false);
  }

  /*
   * Runs one protected importer batch.
   */
  async function runImportBatch(
    accessToken: string,
    batch: number
  ): Promise<ImportResponse> {
    const response =
      await fetch(
        `/api/fetch-news?manual=true&batch=${batch}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept:
              "application/json",
          },
        }
      );

    let data:
      ImportResponse = {};

    try {
      data =
        await response.json();
    } catch {
      data = {};
    }

    if (
      response.status === 401
    ) {
      throw new Error(
        "AUTH_EXPIRED"
      );
    }

    if (
      response.status === 403
    ) {
      throw new Error(
        "ACCESS_DENIED"
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          data.message ||
          `News import failed with status ${response.status}.`
      );
    }

    if (
      data.success === false
    ) {
      throw new Error(
        data.error ||
          data.message ||
          "The news importer reported an error."
      );
    }

    return data;
  }

  /*
   * One button now processes every
   * source batch automatically.
   *
   * Example:
   *
   * 20 sources =
   * 4 batches
   *
   * Batch 0
   * Batch 1
   * Batch 2
   * Batch 3
   */
  async function runNewsImport() {
    if (importing) return;

    setMessage("");
    setError("");
    setImportProgress("");
    setImporting(true);

    try {
      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.access_token
      ) {
        setError(
          "Your admin session has expired. Please sign in again."
        );

        await supabase.auth.signOut();
        router.replace(
          "/admin/login"
        );

        return;
      }

      const user =
        session.user;

      if (
        !user ||
        user.app_metadata?.role !==
          "admin"
      ) {
        setError(
          "You are not authorized to run the news importer."
        );

        await supabase.auth.signOut();
        router.replace("/");

        return;
      }

      const accessToken =
        session.access_token;

      /*
       * First batch tells us how many
       * total batches exist.
       */
      setImportProgress(
        "Starting news import..."
      );

      const firstResult =
        await runImportBatch(
          accessToken,
          0
        );

      const totalBatches =
        Math.max(
          1,
          Number(
            firstResult.totalBatches ||
              1
          )
        );

      let totalAdded =
        Number(
          firstResult.articlesAddedForApproval ||
            0
        );

      let totalSkipped =
        Number(
          firstResult.articlesSkipped ||
            0
        );

      let totalFeedItems =
        Number(
          firstResult.feedItemsSeen ||
            0
        );

      let totalSources =
        Number(
          firstResult.sourcesProcessed ||
            0
        );

      let totalAiGenerated =
        Number(
          firstResult.aiGenerated ||
            0
        );

      let totalNoImage =
        Number(
          firstResult.skippedNoImage ||
            0
        );

      let totalDuplicates =
        Number(
          firstResult.skippedDuplicate ||
            0
        );

      let totalShort =
        Number(
          firstResult.skippedShortSource ||
            0
        );

      let totalPoorQuality =
        Number(
          firstResult.skippedPoorQuality ||
            0
        );

      let allErrors =
        Array.isArray(
          firstResult.errors
        )
          ? [...firstResult.errors]
          : [];

      setImportProgress(
        `Batch 1 of ${totalBatches} completed. Added ${totalAdded} article(s).`
      );

      /*
       * If OpenAI credits are exhausted,
       * stop immediately instead of sending
       * unnecessary requests.
       */
      if (
        firstResult.aiCreditsUnavailable
      ) {
        setError(
          "News importing reached the OpenAI credit limit. RSS sources were reached, but AI article generation cannot continue until OpenAI credits are available."
        );

        return;
      }

      /*
       * Process remaining batches.
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
          await runImportBatch(
            accessToken,
            batch
          );

        totalAdded +=
          Number(
            result.articlesAddedForApproval ||
              0
          );

        totalSkipped +=
          Number(
            result.articlesSkipped ||
              0
          );

        totalFeedItems +=
          Number(
            result.feedItemsSeen ||
              0
          );

        totalSources +=
          Number(
            result.sourcesProcessed ||
              0
          );

        totalAiGenerated +=
          Number(
            result.aiGenerated ||
              0
          );

        totalNoImage +=
          Number(
            result.skippedNoImage ||
              0
          );

        totalDuplicates +=
          Number(
            result.skippedDuplicate ||
              0
          );

        totalShort +=
          Number(
            result.skippedShortSource ||
              0
          );

        totalPoorQuality +=
          Number(
            result.skippedPoorQuality ||
              0
          );

        if (
          Array.isArray(
            result.errors
          )
        ) {
          allErrors.push(
            ...result.errors
          );
        }

        setImportProgress(
          `Batch ${
            batch + 1
          } of ${totalBatches} completed. ${totalAdded} article(s) added so far.`
        );

        if (
          result.aiCreditsUnavailable
        ) {
          setError(
            `Import stopped at batch ${
              batch + 1
            } because OpenAI credits are unavailable. ${totalAdded} article(s) were added before the limit was reached.`
          );

          return;
        }
      }

      setMessage(
        `News import completed successfully. ${totalAdded} new article(s) were added for approval from ${totalSources} source(s).`
      );

      setImportProgress(
        `Finished ${totalBatches} of ${totalBatches} batches. ${totalFeedItems} feed item(s) checked, ${totalAiGenerated} article(s) generated, ${totalSkipped} item(s) skipped.`
      );

      if (
        allErrors.length > 0
      ) {
        console.warn(
          "Importer errors:",
          allErrors
        );
      }

      console.log(
        "News import totals:",
        {
          totalAdded,
          totalSkipped,
          totalFeedItems,
          totalSources,
          totalAiGenerated,
          totalNoImage,
          totalDuplicates,
          totalShort,
          totalPoorQuality,
          errors:
            allErrors,
        }
      );

      await loadData();
    } catch (err) {
      console.error(
        "Manual news import error:",
        err
      );

      if (
        err instanceof Error &&
        err.message ===
          "AUTH_EXPIRED"
      ) {
        setError(
          "Your admin session is no longer authorized. Please sign in again."
        );

        await supabase.auth.signOut();
        router.replace(
          "/admin/login"
        );

        return;
      }

      if (
        err instanceof Error &&
        err.message ===
          "ACCESS_DENIED"
      ) {
        setError(
          "Access denied. Your account does not have administrator permissions."
        );

        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the news importer. Please try again."
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
      setError(
        error.message
      );

      setLoggingOut(false);
      return;
    }

    router.replace(
      "/admin/login"
    );

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

        .importProgress {
          margin-bottom: 18px;
          padding: 13px 16px;
          border: 1px solid #bfdbfe;
          border-radius: 11px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 14px;
          font-weight: 750;
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
        }

        .adminLink:hover {
          background: #1d4ed8;
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

        {importProgress && (
          <div
            className="importProgress"
            role="status"
          >
            {importProgress}
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
                ? "Importing All Batches..."
                : "Import All News Now"}
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
              sources.map(
                (source) => (
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
                        className="actionButton deleteButton"
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
                )
              )
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
                choose exactly where they should
                appear on JNMulee News.
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
                  setAdTitle(
                    e.target.value
                  )
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
                  setAdImageUrl(
                    e.target.value
                  )
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
                  setAdLinkUrl(
                    e.target.value
                  )
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
                  setAdPlacement(
                    e.target.value
                  )
                }
              >
                {AD_PLACEMENTS.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={
                        item.value
                      }
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