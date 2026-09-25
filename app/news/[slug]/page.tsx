import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import ShareButtons from "@/components/ShareButtons";
import ArticleViewTracker from "@/components/ArticleViewTracker";
import DirectAd from "@/components/DirectAd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news-jnnation.vercel.app";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

type ArticleStory = {
  id: string;
  title: string | null;
  slug: string;
  content: string | null;
  image_url: string | null;
  Published: boolean;
  category: string | null;
  created_at: string;
  view_count: number | null;
};

type RelatedStory = {
  id: string;
  title: string | null;
  slug: string;
  image_url: string | null;
  category: string | null;
  created_at: string;
};

type Comment = {
  id: string;
  name: string | null;
  comment: string | null;
  created_at: string;
};

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function sanitizeArticleHtml(value: string): string {
  let html = decodeHtml(value);

  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "")
    .replace(/<meta[\s\S]*?>/gi, "")
    .replace(/<base[\s\S]*?>/gi, "");

  html = html.replace(
    /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    ""
  );

  html = html.replace(
    /\s+(href|src|action|formaction)\s*=\s*(["'])\s*(javascript:|vbscript:|data:text\/html)[\s\S]*?\2/gi,
    ""
  );

  html = html.replace(
    /\s+(href|src|action|formaction)\s*=\s*(javascript:|vbscript:|data:text\/html)[^\s>]*/gi,
    ""
  );

  html = html
    .replace(
      /<(p|div|span|strong|em)[^>]*>\s*(?:by|written by|author)\s+[^<]{1,160}<\/\1>/gi,
      ""
    )
    .replace(
      /<(p|div|span)[^>]*>\s*(?:originally published by|source\s*:|read the original story|view original)\b[\s\S]*?<\/\1>/gi,
      ""
    )
    .replace(
      /<a[^>]*>\s*(?:read the original story|view original|original story)\s*<\/a>/gi,
      ""
    );

  html = html
    .replace(
      /<(p|div|section)[^>]*>\s*(?:this story was originally published by|this article was originally published by)[\s\S]*?<\/\1>/gi,
      ""
    )
    .replace(
      /<(p|div|section)[^>]*>\s*(?:continue reading|read more|follow us|subscribe to our newsletter|sign up for our newsletter)[\s\S]*?<\/\1>/gi,
      ""
    );

  return html.trim();
}

function getDescription(content: string | null): string {
  if (!content) {
    return "Read the latest story on JNMulee News.";
  }

  const text = content
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= 160) {
    return text;
  }

  return `${text.slice(0, 157).replace(/\s+\S*$/, "")}...`;
}

function getImageFromContent(
  content: string | null
): string | null {
  if (!content) return null;

  const match = content.match(
    /<img[^>]+(?:src|data-src|data-original)=["']([^"']+)["']/i
  );

  return match?.[1] || null;
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatCategory(
  category: string | null
): string {
  if (!category) return "News";

  return category
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function categoryHref(
  category: string | null
): string {
  if (!category) return "/category/news";

  const normalized = category.toLowerCase();

  if (normalized === "sports") {
    return "/category/sport";
  }

  return `/category/${encodeURIComponent(normalized)}`;
}

function estimateReadingTime(
  content: string | null
): number {
  if (!content) return 1;

  const plainText = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = plainText
    ? plainText.split(/\s+/).length
    : 0;

  return Math.max(1, Math.ceil(words / 220));
}

function getWordCount(
  content: string | null
): number {
  if (!content) return 0;

  const plainText = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return plainText
    ? plainText.split(/\s+/).length
    : 0;
}

function mapArticleStory(
  raw: unknown
): ArticleStory | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;

  if (
    typeof row.id !== "string" ||
    typeof row.slug !== "string" ||
    typeof row.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    title:
      typeof row.title === "string"
        ? row.title
        : null,
    slug: row.slug,
    content:
      typeof row.content === "string"
        ? row.content
        : null,
    image_url:
      typeof row.image_url === "string"
        ? row.image_url
        : null,
    Published:
      typeof row.Published === "boolean"
        ? row.Published
        : true,
    category:
      typeof row.category === "string"
        ? row.category
        : null,
    created_at: row.created_at,
    view_count:
      typeof row.view_count === "number"
        ? row.view_count
        : null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const result = await supabase
    .from("news")
    .select(
      `
        title,
        slug,
        content,
        image_url,
        category,
        created_at
      `
    )
    .eq("slug", slug)
    .eq("Published", true)
    .maybeSingle();

  const rawData = result.data as unknown;

  const row =
    rawData &&
    typeof rawData === "object"
      ? (rawData as Record<string, unknown>)
      : null;

  if (!row) {
    return {
      title: "Article Not Found | JNMulee News",
      description:
        "The requested article could not be found.",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title =
    typeof row.title === "string"
      ? row.title
      : "JNMulee News";

  const content =
    typeof row.content === "string"
      ? row.content
      : null;

  const slugValue =
    typeof row.slug === "string"
      ? row.slug
      : slug;

  const categoryValue =
    typeof row.category === "string"
      ? row.category
      : null;

  const createdAt =
    typeof row.created_at === "string"
      ? row.created_at
      : new Date().toISOString();

  const image =
    typeof row.image_url === "string"
      ? row.image_url
      : getImageFromContent(content);

  const description =
    getDescription(content);

  const canonicalUrl =
    `${SITE_URL}/news/${slugValue}`;

  return {
    metadataBase: new URL(SITE_URL),

    title:
      `${title} | JNMulee News`,

    description,

    keywords: [
      "JNMulee News",
      "news",
      formatCategory(categoryValue),
    ],

    alternates: {
      canonical: canonicalUrl,
    },

    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },

    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "JNMulee News",
      type: "article",
      publishedTime: createdAt,
      section:
        formatCategory(categoryValue),

      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 675,
              alt: title,
            },
          ]
        : undefined,
    },

    twitter: {
      card: image
        ? "summary_large_image"
        : "summary",
      title,
      description,
      images: image
        ? [image]
        : undefined,
    },
  };
}

export default async function NewsArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    comment?: string;
  }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const result = await supabase
    .from("news")
    .select(
      `
        id,
        title,
        slug,
        content,
        image_url,
        Published,
        category,
        created_at,
        view_count
      `
    )
    .eq("slug", slug)
    .eq("Published", true)
    .maybeSingle();

  const story = mapArticleStory(
    result.data as unknown
  );

  if (result.error || !story) {
    notFound();
  }

  const title =
    story.title || "JNMulee News";

  const content =
    story.content || "";

  const category =
    formatCategory(story.category);

  const safeContent =
    sanitizeArticleHtml(content);

  const readingTime =
    estimateReadingTime(content);

  const wordCount =
    getWordCount(content);

  const articleUrl =
    `${SITE_URL}/news/${story.slug}`;

  const {
    data: commentsData,
  } = await supabase
    .from("comments")
    .select(
      "id,name,comment,created_at"
    )
    .eq("news_id", story.id)
    .eq("approved", true)
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  const comments =
    (commentsData || []) as Comment[];

  let relatedStories: RelatedStory[] = [];

  if (story.category) {
    const { data: relatedData } =
      await supabase
        .from("news")
        .select(
          "id,title,slug,image_url,category,created_at"
        )
        .eq("Published", true)
        .eq(
          "category",
          story.category
        )
        .neq("id", story.id)
        .not(
          "image_url",
          "is",
          null
        )
        .neq("image_url", "")
        .order("created_at", {
          ascending: false,
        })
        .limit(6);

    relatedStories =
      (relatedData || []) as RelatedStory[];
  }

  if (relatedStories.length < 6) {
    const existingIds =
      new Set(
        relatedStories.map(
          (item) => item.id
        )
      );

    existingIds.add(story.id);

    const { data: latestData } =
      await supabase
        .from("news")
        .select(
          "id,title,slug,image_url,category,created_at"
        )
        .eq("Published", true)
        .not(
          "image_url",
          "is",
          null
        )
        .neq("image_url", "")
        .order("created_at", {
          ascending: false,
        })
        .limit(12);

    for (
      const item of
        (latestData || []) as RelatedStory[]
    ) {
      if (
        existingIds.has(item.id)
      ) {
        continue;
      }

      relatedStories.push(item);
      existingIds.add(item.id);

      if (
        relatedStories.length >= 6
      ) {
        break;
      }
    }
  }

  const commentStatus =
    query.comment === "success"
      ? "success"
      : query.comment === "error"
        ? "error"
        : query.comment === "invalid"
          ? "invalid"
          : null;

  const structuredData = {
    "@context":
      "https://schema.org",
    "@type":
      "NewsArticle",
    headline: title,
    description:
      getDescription(content),
    datePublished:
      story.created_at,
    dateModified:
      story.created_at,

    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },

    publisher: {
      "@type":
        "Organization",
      name: "JNMulee News",
      url: SITE_URL,
    },

    image: story.image_url
      ? [story.image_url]
      : undefined,

    articleSection:
      category,

    wordCount,

    isAccessibleForFree:
      true,
  };

  async function postComment(
    formData: FormData
  ) {
    "use server";

    const name =
      String(
        formData.get("name") ?? ""
      ).trim();

    const comment =
      String(
        formData.get("comment") ?? ""
      ).trim();

    /*
     * Validate the submitted values on
     * the server. Never rely only on
     * HTML maxLength/required.
     */

    if (
      name.length < 1 ||
      name.length > 80
    ) {
      redirect(
        `/news/${encodeURIComponent(
          slug
        )}?comment=invalid`
      );
    }

    if (
      comment.length < 1 ||
      comment.length > 2000
    ) {
      redirect(
        `/news/${encodeURIComponent(
          slug
        )}?comment=invalid`
      );
    }

    /*
     * IMPORTANT:
     *
     * This client uses the service-role
     * key only inside this server action.
     *
     * NEVER put SUPABASE_SERVICE_ROLE_KEY
     * in a NEXT_PUBLIC_ variable.
     */

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "Missing Supabase server environment variables."
      );

      redirect(
        `/news/${encodeURIComponent(
          slug
        )}?comment=error`
      );
    }

    const adminClient =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /*
     * Look up the article again on the
     * server so nobody can submit a
     * comment against an arbitrary ID.
     */

    const {
      data: article,
      error: articleError,
    } = await adminClient
      .from("news")
      .select("id")
      .eq("slug", slug)
      .eq("Published", true)
      .maybeSingle();

    if (
      articleError ||
      !article?.id
    ) {
      console.error(
        "Comment article lookup failed:",
        articleError
      );

      redirect(
        `/news/${encodeURIComponent(
          slug
        )}?comment=error`
      );
    }

    /*
     * Insert as NOT APPROVED.
     *
     * The comment will only appear
     * after an administrator approves it.
     */

    const {
      error: insertError,
    } = await adminClient
      .from("comments")
      .insert({
        news_id: article.id,
        name,
        comment,
        approved: false,
      });

    if (insertError) {
      console.error(
        "Comment insert failed:",
        insertError
      );

      redirect(
        `/news/${encodeURIComponent(
          slug
        )}?comment=error`
      );
    }

    redirect(
      `/news/${encodeURIComponent(
        slug
      )}?comment=success`
    );
  }

  return (
    <main className="jn-article-page">
      <style>{`
        .jn-article-page {
          min-height: 100vh;
          background:
            linear-gradient(
              180deg,
              #f8fafc 0%,
              #f7f9fc 42%,
              #ffffff 100%
            );
          color: #172033;
        }

        .jn-article-container {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
        }

        .jn-article-topbar {
          border-bottom: 1px solid #e4e9f0;
          background: rgba(255,255,255,.88);
          backdrop-filter: blur(12px);
        }

        .jn-article-topbar-inner {
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          font-size: 12px;
          color: #64748b;
        }

        .jn-article-topbar-left {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .jn-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #2563eb;
          box-shadow: 0 0 0 4px #dbeafe;
          flex: 0 0 auto;
        }

        .jn-article-date {
          white-space: nowrap;
        }

        .jn-article-search-link {
          color: #2563eb;
          font-weight: 800;
          text-decoration: none;
        }

        .jn-article-search-link:hover {
          text-decoration: underline;
        }

        .jn-article-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          gap: 30px;
          padding: 28px 0 70px;
        }

        .jn-article-main {
          min-width: 0;
        }

        .jn-article-card {
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e3e8f0;
          border-radius: 20px;
          box-shadow:
            0 18px 45px rgba(15, 23, 42, .06);
        }

        .jn-breadcrumb {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          padding: 22px 28px 0;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
        }

        .jn-breadcrumb a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 800;
        }

        .jn-breadcrumb a:hover {
          text-decoration: underline;
        }

        .jn-article-header {
          padding: 19px 28px 30px;
        }

        .jn-article-category {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 15px;
          padding: 7px 11px;
          border-radius: 7px;
          background: #eff6ff;
          color: #1d4ed8;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: .65px;
          font-size: 10px;
          font-weight: 950;
        }

        .jn-article-category::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #2563eb;
        }

        .jn-article-title {
          max-width: 940px;
          margin: 0;
          color: #0b1220;
          font-size: clamp(36px, 5.2vw, 62px);
          line-height: 1.02;
          letter-spacing: -2.5px;
          font-weight: 950;
        }

        .jn-article-description {
          max-width: 850px;
          margin: 20px 0 0;
          color: #526078;
          font-size: clamp(16px, 2vw, 20px);
          line-height: 1.6;
        }

        .jn-article-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 9px;
          margin-top: 22px;
          color: #64748b;
          font-size: 12px;
        }

        .jn-article-meta strong {
          color: #273449;
          font-weight: 850;
        }

        .jn-meta-dot {
          color: #cbd5e1;
        }

        .jn-article-hero {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #e8edf4;
        }

        .jn-article-hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            transparent 65%,
            rgba(11,18,32,.10)
          );
          pointer-events: none;
        }

        .jn-article-body {
          padding: 35px 36px 40px;
          color: #273449;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-size: 19px;
          line-height: 1.86;
        }

        .jn-article-body::first-letter {
          color: #2563eb;
        }

        .jn-article-body p {
          margin: 0 0 1.25em;
        }

        .jn-article-body h2 {
          margin: 1.7em 0 .65em;
          color: #0b1220;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          font-size: 30px;
          line-height: 1.2;
          letter-spacing: -.8px;
          font-weight: 900;
        }

        .jn-article-body h3 {
          margin: 1.5em 0 .65em;
          color: #0b1220;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          font-size: 23px;
          line-height: 1.3;
          font-weight: 850;
        }

        .jn-article-body ul,
        .jn-article-body ol {
          margin: 0 0 1.3em 1.5em;
          padding: 0;
        }

        .jn-article-body li {
          margin-bottom: .55em;
        }

        .jn-article-body a {
          color: #2563eb;
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 3px;
        }

        .jn-article-body a:hover {
          color: #1d4ed8;
        }

        .jn-article-body img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 25px auto;
          border-radius: 12px;
        }

        .jn-article-body blockquote {
          margin: 28px 0;
          padding: 18px 22px;
          border-left: 4px solid #2563eb;
          border-radius: 0 10px 10px 0;
          background: #eff6ff;
          color: #334155;
        }

        .jn-share-area {
          padding: 21px 30px 28px;
          border-top: 1px solid #e8edf3;
          background: #fbfcfe;
        }

        .jn-share-title {
          margin: 0 0 12px;
          color: #334155;
          font-size: 13px;
          font-weight: 900;
        }

        .jn-sidebar {
          min-width: 0;
        }

        .jn-sidebar-sticky {
          position: sticky;
          top: 90px;
        }

        .jn-side-box {
          margin-bottom: 18px;
          padding: 19px;
          background: #ffffff;
          border: 1px solid #e3e8f0;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(15,23,42,.04);
        }

        .jn-side-heading {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 0 0 15px;
          color: #0b1220;
          font-size: 18px;
          font-weight: 950;
        }

        .jn-side-heading::before {
          content: "";
          width: 4px;
          height: 20px;
          border-radius: 99px;
          background: #2563eb;
        }

        .jn-side-story {
          display: grid;
          grid-template-columns: 92px minmax(0,1fr);
          gap: 12px;
          padding: 13px 0;
          border-top: 1px solid #edf1f5;
          color: inherit;
          text-decoration: none;
        }

        .jn-side-story:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .jn-side-story:hover .jn-side-story-title {
          color: #2563eb;
        }

        .jn-side-image {
          position: relative;
          width: 92px;
          height: 66px;
          overflow: hidden;
          border-radius: 9px;
          background: #e8edf4;
        }

        .jn-side-image img {
          object-fit: cover;
        }

        .jn-side-category {
          display: block;
          margin-bottom: 4px;
          color: #2563eb;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .55px;
          text-transform: uppercase;
        }

        .jn-side-story-title {
          margin: 0;
          color: #172033;
          font-size: 13px;
          line-height: 1.38;
          font-weight: 850;
          transition: color .18s ease;
        }

        .jn-comments {
          margin-top: 28px;
          padding: 28px;
          background: #ffffff;
          border: 1px solid #e3e8f0;
          border-radius: 18px;
          box-shadow: 0 12px 35px rgba(15,23,42,.04);
        }

        .jn-comments-title {
          margin: 0 0 6px;
          color: #0b1220;
          font-size: 25px;
          letter-spacing: -.5px;
          font-weight: 950;
        }

        .jn-comments-subtitle {
          margin: 0 0 21px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .jn-comment-status {
          margin-bottom: 16px;
          padding: 12px 14px;
          border-radius: 9px;
          font-size: 13px;
          line-height: 1.5;
        }

        .jn-comment-success {
          color: #065f46;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
        }

        .jn-comment-error {
          color: #991b1b;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .jn-comment-form {
          display: grid;
          gap: 12px;
          margin-bottom: 28px;
        }

        .jn-comment-form input,
        .jn-comment-form textarea {
          width: 100%;
          border: 1px solid #d7dee8;
          border-radius: 10px;
          padding: 12px 14px;
          outline: none;
          background: #ffffff;
          color: #172033;
          font: inherit;
          transition:
            border-color .18s ease,
            box-shadow .18s ease;
        }

        .jn-comment-form input:focus,
        .jn-comment-form textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37,99,235,.10);
        }

        .jn-comment-form textarea {
          min-height: 135px;
          resize: vertical;
        }

        .jn-comment-button {
          justify-self: start;
          border: 0;
          border-radius: 9px;
          padding: 11px 18px;
          background: #2563eb;
          color: #ffffff;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 7px 16px rgba(37,99,235,.20);
          transition:
            transform .18s ease,
            background .18s ease,
            box-shadow .18s ease;
        }

        .jn-comment-button:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(37,99,235,.25);
        }

        .jn-comment-item {
          padding: 18px 0;
          border-top: 1px solid #e8edf3;
        }

        .jn-comment-name {
          margin: 0 0 4px;
          color: #172033;
          font-size: 14px;
          font-weight: 900;
        }

        .jn-comment-date {
          margin: 0 0 9px;
          color: #94a3b8;
          font-size: 11px;
        }

        .jn-comment-text {
          margin: 0;
          color: #526078;
          font-size: 14px;
          line-height: 1.65;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .jn-no-comments {
          margin: 0;
          padding: 15px 0 4px;
          color: #64748b;
          font-size: 13px;
        }

        .jn-related {
          margin-top: 30px;
        }

        .jn-related-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          color: #0b1220;
          font-size: 26px;
          letter-spacing: -.6px;
          font-weight: 950;
        }

        .jn-related-heading::before {
          content: "";
          width: 5px;
          height: 25px;
          border-radius: 99px;
          background: #2563eb;
        }

        .jn-related-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 18px;
          margin-top: 17px;
        }

        .jn-related-card {
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e3e8f0;
          border-radius: 14px;
          color: inherit;
          text-decoration: none;
          box-shadow: 0 8px 25px rgba(15,23,42,.04);
          transition:
            transform .18s ease,
            box-shadow .18s ease,
            border-color .18s ease;
        }

        .jn-related-card:hover {
          transform: translateY(-3px);
          border-color: #c8d8f5;
          box-shadow: 0 14px 32px rgba(15,23,42,.08);
        }

        .jn-related-image {
          position: relative;
          aspect-ratio: 16 / 9;
          background: #e8edf4;
        }

        .jn-related-image img {
          object-fit: cover;
          transition: transform .3s ease;
        }

        .jn-related-card:hover .jn-related-image img {
          transform: scale(1.035);
        }

        .jn-related-body {
          padding: 14px;
        }

        .jn-related-category {
          display: block;
          margin-bottom: 6px;
          color: #2563eb;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .55px;
          text-transform: uppercase;
        }

        .jn-related-title {
          margin: 0;
          color: #172033;
          font-size: 15px;
          line-height: 1.4;
          font-weight: 850;
        }

        .jn-related-card:hover .jn-related-title {
          color: #1d4ed8;
        }

        @media (max-width: 1000px) {
          .jn-article-layout {
            grid-template-columns: minmax(0, 1fr);
          }

          .jn-sidebar-sticky {
            position: static;
          }

          .jn-sidebar {
            display: grid;
            grid-template-columns: repeat(2, minmax(0,1fr));
            gap: 18px;
          }

          .jn-sidebar .jn-side-box {
            margin-bottom: 0;
          }
        }

        @media (max-width: 760px) {
          .jn-article-container {
            width: min(100% - 20px, 1240px);
          }

          .jn-article-topbar-inner {
            min-height: 38px;
          }

          .jn-article-layout {
            padding-top: 15px;
            padding-bottom: 45px;
          }

          .jn-article-card {
            border-radius: 15px;
          }

          .jn-breadcrumb {
            padding: 17px 17px 0;
          }

          .jn-article-header {
            padding: 17px 17px 23px;
          }

          .jn-article-title {
            font-size: 36px;
            letter-spacing: -1.45px;
            line-height: 1.05;
          }

          .jn-article-description {
            margin-top: 15px;
            font-size: 16px;
            line-height: 1.55;
          }

          .jn-article-meta {
            gap: 7px;
            margin-top: 17px;
            line-height: 1.6;
          }

          .jn-article-hero {
            aspect-ratio: 16 / 10;
          }

          .jn-article-body {
            padding: 25px 18px 29px;
            font-size: 18px;
            line-height: 1.78;
          }

          .jn-article-body h2 {
            font-size: 26px;
          }

          .jn-article-body h3 {
            font-size: 21px;
          }

          .jn-share-area {
            padding: 18px;
          }

          .jn-sidebar {
            display: block;
          }

          .jn-sidebar .jn-side-box {
            margin-bottom: 18px;
          }

          .jn-comments {
            padding: 20px;
            border-radius: 15px;
          }

          .jn-related-grid {
            grid-template-columns: 1fr;
          }

          .jn-related-heading {
            font-size: 23px;
          }
        }

        @media (max-width: 430px) {
          .jn-article-title {
            font-size: 32px;
          }

          .jn-article-meta {
            font-size: 11px;
          }

          .jn-article-body {
            font-size: 17.5px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .jn-related-card,
          .jn-related-image img,
          .jn-side-story-title,
          .jn-comment-button {
            transition: none !important;
          }
        }
      `}</style>

      <div className="jn-article-topbar">
        <div className="jn-article-container jn-article-topbar-inner">
          <div className="jn-article-topbar-left">
            <span className="jn-live-dot" />

            <span>
              JNMulee News • Independent news & information
            </span>
          </div>

          <Link
            href="/search"
            className="jn-article-search-link"
          >
            Search stories
          </Link>
        </div>
      </div>

      <div className="jn-article-container jn-article-layout">
        <div className="jn-article-main">
          <article className="jn-article-card">
            <div className="jn-breadcrumb">
              <Link href="/">
                Home
              </Link>

              <span>›</span>

              <Link
                href={categoryHref(
                  story.category
                )}
              >
                {category}
              </Link>

              <span>›</span>

              <span>Article</span>
            </div>

            <header className="jn-article-header">
              <Link
                href={categoryHref(
                  story.category
                )}
                className="jn-article-category"
              >
                {category}
              </Link>

              <h1 className="jn-article-title">
                {title}
              </h1>

              <p className="jn-article-description">
                {getDescription(content)}
              </p>

              <div className="jn-article-meta">
                <span>
                  Published{" "}
                  <strong>
                    {formatDate(
                      story.created_at
                    )}
                  </strong>
                </span>

                <span className="jn-meta-dot">
                  •
                </span>

                <span>
                  {readingTime} min read
                </span>

                <span className="jn-meta-dot">
                  •
                </span>

                <span>
                  {wordCount.toLocaleString()}{" "}
                  words
                </span>

                {story.view_count !== null &&
                  story.view_count !==
                    undefined && (
                    <>
                      <span className="jn-meta-dot">
                        •
                      </span>

                      <span>
                        {story.view_count.toLocaleString()}{" "}
                        views
                      </span>
                    </>
                  )}
              </div>
            </header>

            {story.image_url && (
              <div className="jn-article-hero">
                <Image
                  src={story.image_url}
                  alt={title}
                  fill
                  priority
                  sizes="(max-width: 760px) 100vw, (max-width: 1000px) 100vw, 900px"
                />
              </div>
            )}

            <div
              className="jn-article-body"
              dangerouslySetInnerHTML={{
                __html: safeContent,
              }}
            />

            <div className="jn-share-area">
              <p className="jn-share-title">
                Share this story
              </p>

              <ShareButtons
                title={title}
                url={articleUrl}
              />
            </div>
          </article>

          <DirectAd placement="article" />

          <section
            className="jn-comments"
            id="comments"
          >
            <h2 className="jn-comments-title">
              Comments
            </h2>

            <p className="jn-comments-subtitle">
              Join the conversation. Comments
              containing prohibited abusive or
              sexual content may be blocked
              automatically.
            </p>

            {commentStatus === "success" && (
              <div className="jn-comment-status jn-comment-success">
                Your comment was submitted successfully
                and is waiting for approval.
              </div>
            )}

            {commentStatus === "error" && (
              <div className="jn-comment-status jn-comment-error">
                We could not post your comment right
                now. Please try again in a moment.
              </div>
            )}

            {commentStatus === "invalid" && (
              <div className="jn-comment-status jn-comment-error">
                Please enter a valid name and comment.
                Your name must be 1–80 characters and
                your comment must be 1–2,000 characters.
              </div>
            )}

            <form
              action={postComment}
              className="jn-comment-form"
            >
              <input
                type="text"
                name="name"
                placeholder="Your name"
                maxLength={80}
                required
                autoComplete="name"
              />

              <textarea
                name="comment"
                placeholder="Write your comment..."
                maxLength={2000}
                required
              />

              <button
                type="submit"
                className="jn-comment-button"
              >
                Post Comment
              </button>
            </form>

            {comments.length > 0 ? (
              <div>
                {comments.map(
                  (comment) => (
                    <div
                      className="jn-comment-item"
                      key={comment.id}
                    >
                      <p className="jn-comment-name">
                        {comment.name ||
                          "Reader"}
                      </p>

                      <p className="jn-comment-date">
                        {formatDateTime(
                          comment.created_at
                        )}
                      </p>

                      <p className="jn-comment-text">
                        {comment.comment ||
                          ""}
                      </p>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="jn-no-comments">
                No comments yet. Be the first to
                join the conversation.
              </p>
            )}
          </section>

          <DirectAd placement="article_middle" />

          {relatedStories.length > 0 && (
            <section className="jn-related">
              <h2 className="jn-related-heading">
                More Stories
              </h2>

              <div className="jn-related-grid">
                {relatedStories
                  .slice(0, 6)
                  .map(
                    (related) => (
                      <Link
                        href={`/news/${related.slug}`}
                        className="jn-related-card"
                        key={related.id}
                      >
                        {related.image_url && (
                          <div className="jn-related-image">
                            <Image
                              src={
                                related.image_url
                              }
                              alt={
                                related.title ||
                                "News story"
                              }
                              fill
                              sizes="(max-width: 760px) 100vw, 33vw"
                            />
                          </div>
                        )}

                        <div className="jn-related-body">
                          <span className="jn-related-category">
                            {formatCategory(
                              related.category
                            )}
                          </span>

                          <h3 className="jn-related-title">
                            {related.title ||
                              "Read more"}
                          </h3>
                        </div>
                      </Link>
                    )
                  )}
              </div>
            </section>
          )}
        </div>

        <aside className="jn-sidebar">
          <div className="jn-sidebar-sticky">
            <DirectAd placement="article" />

            {relatedStories.length > 0 && (
              <div className="jn-side-box">
                <h2 className="jn-side-heading">
                  Latest Stories
                </h2>

                {relatedStories
                  .slice(0, 5)
                  .map(
                    (related) => (
                      <Link
                        href={`/news/${related.slug}`}
                        className="jn-side-story"
                        key={`side-${related.id}`}
                      >
                        {related.image_url && (
                          <div className="jn-side-image">
                            <Image
                              src={
                                related.image_url
                              }
                              alt={
                                related.title ||
                                "News story"
                              }
                              fill
                              sizes="92px"
                            />
                          </div>
                        )}

                        <div>
                          <span className="jn-side-category">
                            {formatCategory(
                              related.category
                            )}
                          </span>

                          <h3 className="jn-side-story-title">
                            {related.title ||
                              "Read story"}
                          </h3>
                        </div>
                      </Link>
                    )
                  )}
              </div>
            )}

            <DirectAd placement="article_middle" />
          </div>
        </aside>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              structuredData
            ),
        }}
      />

      <ArticleViewTracker
        newsId={story.id}
      />
    </main>
  );
}