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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
  content_type: string | null;
  source_name: string | null;
  canonical_url: string | null;
  attribution_text: string | null;
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

function getImageFromContent(content: string | null): string | null {
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

function formatCategory(category: string | null): string {
  if (!category) return "News";

  return category
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function categoryHref(category: string | null): string {
  if (!category) return "/category/news";

  const normalized = category.toLowerCase();

  if (normalized === "sports") {
    return "/category/sport";
  }

  return `/category/${encodeURIComponent(normalized)}`;
}

function estimateReadingTime(content: string | null): number {
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

function getWordCount(content: string | null): number {
  if (!content) return 0;

  const plainText = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return plainText ? plainText.split(/\s+/).length : 0;
}

function mapArticleStory(raw: unknown): ArticleStory | null {
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
    title: typeof row.title === "string" ? row.title : null,
    slug: row.slug,
    content: typeof row.content === "string" ? row.content : null,
    image_url:
      typeof row.image_url === "string" ? row.image_url : null,
    Published:
      typeof row.Published === "boolean" ? row.Published : true,
    category:
      typeof row.category === "string" ? row.category : null,
    created_at: row.created_at,
    view_count:
      typeof row.view_count === "number"
        ? row.view_count
        : null,
    content_type:
      typeof row.content_type === "string"
        ? row.content_type
        : null,
    source_name:
      typeof row.source_name === "string"
        ? row.source_name
        : null,
    canonical_url:
      typeof row.canonical_url === "string"
        ? row.canonical_url
        : null,
    attribution_text:
      typeof row.attribution_text === "string"
        ? row.attribution_text
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
        created_at,
        content_type,
        source_name,
        canonical_url
      `
    )
    .eq("slug", slug)
    .eq("Published", true)
    .maybeSingle();

  const rawData = result.data as unknown;
  const row =
    rawData && typeof rawData === "object"
      ? (rawData as Record<string, unknown>)
      : null;

  if (!row) {
    return {
      title: "Article Not Found | JNMulee News",
      description: "The requested article could not be found.",
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

  const sourceName =
    typeof row.source_name === "string"
      ? row.source_name
      : null;

  const image =
    typeof row.image_url === "string"
      ? row.image_url
      : getImageFromContent(content);

  const description = getDescription(content);
  const canonicalUrl = `${SITE_URL}/news/${slugValue}`;

  return {
    metadataBase: new URL(SITE_URL),

    title: `${title} | JNMulee News`,

    description,

    keywords: [
      "JNMulee News",
      "news",
      formatCategory(categoryValue),
      ...(sourceName ? [sourceName] : []),
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
      section: formatCategory(categoryValue),
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
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function NewsArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string }>;
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
        view_count,
        content_type,
        source_name,
        canonical_url,
        attribution_text
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

  const title = story.title || "JNMulee News";
  const content = story.content || "";
  const category = formatCategory(story.category);

  const safeContent = sanitizeArticleHtml(content);

  const readingTime = estimateReadingTime(content);
  const wordCount = getWordCount(content);

  const articleUrl = `${SITE_URL}/news/${story.slug}`;

  const { data: commentsData } = await supabase
    .from("comments")
    .select("id,name,comment,created_at")
    .eq("news_id", story.id)
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(100);

  const comments = (commentsData || []) as Comment[];

  let relatedStories: RelatedStory[] = [];

  if (story.category) {
    const { data: relatedData } = await supabase
      .from("news")
      .select(
        "id,title,slug,image_url,category,created_at"
      )
      .eq("Published", true)
      .eq("category", story.category)
      .neq("id", story.id)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .order("created_at", { ascending: false })
      .limit(6);

    relatedStories = (relatedData || []) as RelatedStory[];
  }

  if (relatedStories.length < 6) {
    const existingIds = new Set(
      relatedStories.map((item) => item.id)
    );

    existingIds.add(story.id);

    const { data: latestData } = await supabase
      .from("news")
      .select(
        "id,title,slug,image_url,category,created_at"
      )
      .eq("Published", true)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .order("created_at", { ascending: false })
      .limit(12);

    for (const item of (latestData || []) as RelatedStory[]) {
      if (existingIds.has(item.id)) continue;

      relatedStories.push(item);
      existingIds.add(item.id);

      if (relatedStories.length >= 6) break;
    }
  }

  const commentStatus =
    query.comment === "success"
      ? "success"
      : query.comment === "error"
        ? "error"
        : null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: getDescription(content),
    datePublished: story.created_at,
    dateModified: story.created_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "JNMulee News",
      url: SITE_URL,
    },
    image: story.image_url
      ? [story.image_url]
      : undefined,
    articleSection: category,
    wordCount,
    isAccessibleForFree: true,
    ...(story.source_name
      ? {
          isBasedOn: {
            "@type": "NewsArticle",
            publisher: {
              "@type": "Organization",
              name: story.source_name,
            },
            url: story.canonical_url || undefined,
          },
        }
      : {}),
  };

  async function postComment(formData: FormData) {
    "use server";

    const name = String(
      formData.get("name") || ""
    ).trim();

    const comment = String(
      formData.get("comment") || ""
    ).trim();

    if (!name || name.length > 80) {
      redirect(`/news/${slug}?comment=error`);
    }

    if (!comment || comment.length > 2000) {
      redirect(`/news/${slug}?comment=error`);
    }

    const commentClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const articleResult = await commentClient
      .from("news")
      .select("id")
      .eq("slug", slug)
      .eq("Published", true)
      .maybeSingle();

    const articleData = articleResult.data as unknown;

    const article =
      articleData && typeof articleData === "object"
        ? (articleData as Record<string, unknown>)
        : null;

    const articleId =
      article && typeof article.id === "string"
        ? article.id
        : null;

    if (!articleId) {
      redirect(`/news/${slug}?comment=error`);
    }

    const { error: insertError } = await commentClient
      .from("comments")
      .insert({
        news_id: articleId,
        name,
        comment,
        approved: false,
      });

    if (insertError) {
      redirect(`/news/${slug}?comment=error`);
    }

    redirect(`/news/${slug}?comment=success`);
  }

  return (
    <main className="articlePage">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .articlePage {
          min-height: 100vh;
          background: #f5f6f8;
          color: #111827;
        }

        .container {
          width: min(1200px, calc(100% - 32px));
          margin: 0 auto;
        }

        .siteHeader {
          position: sticky;
          top: 0;
          z-index: 50;
          background: #c8102e;
          color: white;
          box-shadow: 0 2px 12px rgba(0,0,0,.12);
        }

        .headerTop {
          min-height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .logo {
          color: white;
          text-decoration: none;
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -.8px;
          white-space: nowrap;
        }

        .headerSearch {
          width: min(380px, 100%);
        }

        .headerSearch input {
          width: 100%;
          height: 40px;
          border: 0;
          border-radius: 999px;
          padding: 0 18px;
          font-size: 14px;
          outline: none;
        }

        .categoryNav {
          background: #a90d27;
          border-top: 1px solid rgba(255,255,255,.12);
          overflow-x: auto;
          scrollbar-width: none;
        }

        .categoryNav::-webkit-scrollbar {
          display: none;
        }

        .categoryNavInner {
          display: flex;
          align-items: center;
          min-height: 42px;
          white-space: nowrap;
        }

        .categoryNav a {
          color: rgba(255,255,255,.95);
          text-decoration: none;
          padding: 11px 14px;
          font-size: 13px;
          font-weight: 700;
        }

        .categoryNav a:hover {
          background: rgba(255,255,255,.12);
        }

        .breakingBar {
          background: #111827;
          color: white;
        }

        .breakingInner {
          min-height: 38px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
        }

        .breakingLabel {
          background: #c8102e;
          padding: 5px 9px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .7px;
        }

        .articleLayout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 30px;
          padding-top: 30px;
          padding-bottom: 60px;
        }

        .articleMain {
          min-width: 0;
        }

        .articleCard {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
        }

        .breadcrumb {
          padding: 20px 24px 0;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          color: #6b7280;
          font-size: 13px;
        }

        .breadcrumb a {
          color: #c8102e;
          text-decoration: none;
          font-weight: 700;
        }

        .articleHeader {
          padding: 18px 24px 24px;
        }

        .categoryBadge {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 5px;
          background: #fef2f2;
          color: #c8102e;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: .5px;
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 13px;
        }

        .articleTitle {
          margin: 0;
          font-size: clamp(32px, 5vw, 52px);
          line-height: 1.04;
          letter-spacing: -1.8px;
          font-weight: 950;
          color: #111827;
        }

        .articleDescription {
          margin: 18px 0 0;
          color: #596273;
          font-size: 18px;
          line-height: 1.6;
        }

        .articleMeta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 20px;
          color: #6b7280;
          font-size: 13px;
        }

        .articleMeta strong {
          color: #374151;
        }

        .articleHero {
          position: relative;
          aspect-ratio: 16 / 9;
          background: #e5e7eb;
        }

        .articleHero img {
          object-fit: cover;
        }

        .attribution {
          margin: 0;
          padding: 12px 24px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
          color: #596273;
          font-size: 13px;
          line-height: 1.5;
        }

        .attribution a {
          color: #c8102e;
          font-weight: 800;
          text-decoration: none;
        }

        .articleBody {
          padding: 28px 30px 36px;
          font-family: Georgia, "Times New Roman", serif;
          color: #20242b;
          font-size: 19px;
          line-height: 1.82;
          overflow-wrap: anywhere;
        }

        .articleBody p {
          margin: 0 0 1.35em;
        }

        .articleBody h2,
        .articleBody h3 {
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.25;
          color: #111827;
          margin: 1.5em 0 .65em;
        }

        .articleBody h2 {
          font-size: 30px;
        }

        .articleBody h3 {
          font-size: 24px;
        }

        .articleBody strong {
          color: #111827;
        }

        .articleBody a {
          color: #c8102e;
          text-decoration: underline;
        }

        .articleBody ul,
        .articleBody ol {
          margin: 0 0 1.35em;
          padding-left: 1.5em;
        }

        .articleBody blockquote {
          margin: 1.5em 0;
          padding: 16px 20px;
          border-left: 4px solid #c8102e;
          background: #f9fafb;
          color: #4b5563;
          font-style: italic;
        }

        .articleBody img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 25px auto;
          border-radius: 8px;
        }

        .shareArea {
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
        }

        .shareTitle {
          margin: 0 0 12px;
          font-size: 14px;
          font-weight: 900;
          font-family: Arial, Helvetica, sans-serif;
        }

        .sourceBox {
          margin: 0 24px 24px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fafafa;
          font-family: Arial, Helvetica, sans-serif;
        }

        .sourceBoxTitle {
          margin: 0 0 6px;
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: .6px;
          font-weight: 900;
        }

        .sourceBoxText {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: #374151;
        }

        .sourceBox a {
          color: #c8102e;
          font-weight: 800;
          text-decoration: none;
        }

        .sidebar {
          min-width: 0;
        }

        .sidebarSticky {
          position: sticky;
          top: 130px;
        }

        .sideBox {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .sideTitle {
          margin: 0;
          padding: 15px 17px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 17px;
          font-weight: 900;
        }

        .sideStory {
          display: grid;
          grid-template-columns: 88px minmax(0, 1fr);
          gap: 12px;
          padding: 13px 15px;
          border-bottom: 1px solid #eef0f3;
          text-decoration: none;
          color: inherit;
        }

        .sideStory:last-child {
          border-bottom: 0;
        }

        .sideStoryImage {
          position: relative;
          width: 88px;
          height: 62px;
          overflow: hidden;
          border-radius: 7px;
          background: #e5e7eb;
        }

        .sideStoryImage img {
          object-fit: cover;
        }

        .sideStoryCategory {
          display: block;
          margin-bottom: 4px;
          color: #c8102e;
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 900;
        }

        .sideStoryTitle {
          margin: 0;
          font-size: 13px;
          line-height: 1.35;
          font-weight: 800;
        }

        .commentsSection {
          margin-top: 28px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 25px;
        }

        .sectionTitle {
          margin: 0 0 6px;
          font-size: 24px;
          font-weight: 900;
        }

        .sectionSubtitle {
          margin: 0 0 20px;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
        }

        .commentForm {
          display: grid;
          gap: 12px;
          margin-bottom: 28px;
        }

        .commentForm input,
        .commentForm textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          padding: 12px 14px;
          font: inherit;
          outline: none;
          background: white;
        }

        .commentForm input:focus,
        .commentForm textarea:focus {
          border-color: #c8102e;
          box-shadow: 0 0 0 3px rgba(200,16,46,.08);
        }

        .commentForm textarea {
          min-height: 130px;
          resize: vertical;
        }

        .commentButton {
          justify-self: start;
          border: 0;
          border-radius: 8px;
          background: #c8102e;
          color: white;
          padding: 11px 18px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .commentButton:hover {
          background: #a90d27;
        }

        .commentStatus {
          padding: 12px 14px;
          border-radius: 8px;
          margin-bottom: 15px;
          font-size: 14px;
          line-height: 1.5;
        }

        .commentSuccess {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .commentError {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .commentItem {
          padding: 17px 0;
          border-top: 1px solid #e5e7eb;
        }

        .commentName {
          margin: 0 0 4px;
          font-weight: 900;
          font-size: 14px;
        }

        .commentDate {
          margin: 0 0 9px;
          color: #9ca3af;
          font-size: 11px;
        }

        .commentText {
          margin: 0;
          color: #4b5563;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .noComments {
          padding: 15px 0 5px;
          color: #6b7280;
          font-size: 14px;
        }

        .relatedSection {
          margin-top: 30px;
        }

        .relatedGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-top: 16px;
        }

        .relatedCard {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
        }

        .relatedImage {
          position: relative;
          aspect-ratio: 16 / 9;
          background: #e5e7eb;
        }

        .relatedImage img {
          object-fit: cover;
        }

        .relatedBody {
          padding: 13px;
        }

        .relatedCategory {
          display: block;
          color: #c8102e;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .relatedTitle {
          margin: 0;
          font-size: 15px;
          line-height: 1.35;
          font-weight: 850;
        }

        .siteFooter {
          background: #111827;
          color: white;
          padding: 40px 0;
        }

        .footerLinks {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin-bottom: 20px;
        }

        .footerLinks a {
          color: #d1d5db;
          text-decoration: none;
          font-size: 14px;
        }

        .footerLinks a:hover {
          color: white;
        }

        .footerCopyright {
          margin: 0;
          color: #9ca3af;
          font-size: 13px;
        }

        @media (max-width: 950px) {
          .articleLayout {
            grid-template-columns: 1fr;
          }

          .sidebarSticky {
            position: static;
          }

          .sidebar {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
          }

          .sidebar .sideBox {
            margin-bottom: 0;
          }
        }

        @media (max-width: 700px) {
          .container {
            width: min(100% - 22px, 1200px);
          }

          .headerTop {
            min-height: 58px;
          }

          .logo {
            font-size: 21px;
          }

          .headerSearch {
            display: none;
          }

          .articleLayout {
            padding-top: 16px;
          }

          .articleHeader {
            padding: 15px 17px 20px;
          }

          .breadcrumb {
            padding: 17px 17px 0;
          }

          .articleTitle {
            font-size: 34px;
            letter-spacing: -1px;
          }

          .articleDescription {
            font-size: 16px;
          }

          .articleHero {
            aspect-ratio: 16 / 10;
          }

          .attribution {
            padding: 11px 17px;
          }

          .articleBody {
            padding: 23px 18px 28px;
            font-size: 18px;
            line-height: 1.75;
          }

          .shareArea {
            padding: 18px;
          }

          .sourceBox {
            margin-left: 18px;
            margin-right: 18px;
          }

          .sidebar {
            display: block;
          }

          .sidebar .sideBox {
            margin-bottom: 18px;
          }

          .relatedGrid {
            grid-template-columns: 1fr;
          }

          .commentsSection {
            padding: 19px;
          }
        }
      `}</style>

      <header className="siteHeader">
        <div className="container headerTop">
          <Link href="/" className="logo">
            JNMulee News
          </Link>

          <form
            action="/search"
            method="GET"
            className="headerSearch"
          >
            <input
              type="search"
              name="q"
              placeholder="Search JNMulee News..."
              aria-label="Search JNMulee News"
            />
          </form>
        </div>

        <nav
          className="categoryNav"
          aria-label="Main navigation"
        >
          <div className="container categoryNavInner">
            <Link href="/">Home</Link>
            <Link href="/category/news">News</Link>
            <Link href="/category/sport">Sports</Link>
            <Link href="/category/entertainment">
              Entertainment
            </Link>
            <Link href="/category/gossip">Gossip</Link>
            <Link href="/category/business">Business</Link>
            <Link href="/category/technology">
              Technology
            </Link>
            <Link href="/category/politics">Politics</Link>
            <Link href="/category/crypto">Crypto</Link>
          </div>
        </nav>
      </header>

      <div className="breakingBar">
        <div className="container breakingInner">
          <span className="breakingLabel">
            LATEST
          </span>

          <span>
            JNMulee News — Latest stories and updates
          </span>
        </div>
      </div>

      <div className="container articleLayout">
        <div className="articleMain">
          <article className="articleCard">
            <div className="breadcrumb">
              <Link href="/">Home</Link>
              <span>›</span>

              <Link href={categoryHref(story.category)}>
                {category}
              </Link>

              <span>›</span>
              <span>Article</span>
            </div>

            <header className="articleHeader">
              <Link
                href={categoryHref(story.category)}
                className="categoryBadge"
              >
                {category}
              </Link>

              <h1 className="articleTitle">
                {title}
              </h1>

              <p className="articleDescription">
                {getDescription(content)}
              </p>

              <div className="articleMeta">
                <span>
                  Published{" "}
                  <strong>
                    {formatDate(story.created_at)}
                  </strong>
                </span>

                <span>•</span>

                <span>
                  {readingTime} min read
                </span>

                <span>•</span>

                <span>
                  {wordCount.toLocaleString()} words
                </span>

                {story.view_count !== null &&
                  story.view_count !== undefined && (
                    <>
                      <span>•</span>

                      <span>
                        {story.view_count.toLocaleString()} views
                      </span>
                    </>
                  )}
              </div>
            </header>

            {story.image_url && (
              <div className="articleHero">
                <Image
                  src={story.image_url}
                  alt={title}
                  fill
                  priority
                  sizes="(max-width: 950px) 100vw, 820px"
                />
              </div>
            )}

            {story.content_type === "syndicated" &&
              (story.source_name ||
                story.attribution_text) && (
                <div className="attribution">
                  {story.attribution_text ||
                    `Originally published by ${story.source_name}`}

                  {story.canonical_url && (
                    <>
                      {" "}

                      <a
                        href={story.canonical_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                      >
                        View original
                      </a>
                    </>
                  )}
                </div>
              )}

            <div
              className="articleBody"
              dangerouslySetInnerHTML={{
                __html: safeContent,
              }}
            />

            {story.content_type === "syndicated" &&
              story.source_name && (
                <div className="sourceBox">
                  <p className="sourceBoxTitle">
                    Source
                  </p>

                  <p className="sourceBoxText">
                    This story was originally published by{" "}
                    <strong>
                      {story.source_name}
                    </strong>
                    .

                    {story.canonical_url && (
                      <>
                        {" "}

                        <a
                          href={story.canonical_url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                        >
                          Read the original story
                        </a>
                        .
                      </>
                    )}
                  </p>
                </div>
              )}

            <div className="shareArea">
              <p className="shareTitle">
                Share this story
              </p>

              <ShareButtons
                title={title}
                url={articleUrl}
              />
            </div>
          </article>

          <DirectAd placement="article" />

          <section className="commentsSection">
            <h2 className="sectionTitle">
              Comments
            </h2>

            <p className="sectionSubtitle">
              Join the conversation. Comments containing
              prohibited abusive or sexual content may be
              blocked automatically.
            </p>

            {commentStatus === "success" && (
              <div className="commentStatus commentSuccess">
                Your comment was posted successfully.
              </div>
            )}

            {commentStatus === "error" && (
              <div className="commentStatus commentError">
                Your comment could not be posted. Please
                check your name and comment and try again.
              </div>
            )}

            <form
              action={postComment}
              className="commentForm"
            >
              <input
                type="text"
                name="name"
                placeholder="Your name"
                maxLength={80}
                required
              />

              <textarea
                name="comment"
                placeholder="Write your comment..."
                maxLength={2000}
                required
              />

              <button
                type="submit"
                className="commentButton"
              >
                Post Comment
              </button>
            </form>

            {comments.length > 0 ? (
              <div>
                {comments.map((comment) => (
                  <div
                    className="commentItem"
                    key={comment.id}
                  >
                    <p className="commentName">
                      {comment.name || "Reader"}
                    </p>

                    <p className="commentDate">
                      {formatDateTime(
                        comment.created_at
                      )}
                    </p>

                    <p className="commentText">
                      {comment.comment || ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="noComments">
                No comments yet. Be the first to join
                the conversation.
              </p>
            )}
          </section>

          <DirectAd placement="article_middle" />

          {relatedStories.length > 0 && (
            <section className="relatedSection">
              <h2 className="sectionTitle">
                More Stories
              </h2>

              <div className="relatedGrid">
                {relatedStories
                  .slice(0, 6)
                  .map((related) => (
                    <Link
                      href={`/news/${related.slug}`}
                      className="relatedCard"
                      key={related.id}
                    >
                      {related.image_url && (
                        <div className="relatedImage">
                          <Image
                            src={related.image_url}
                            alt={
                              related.title ||
                              "News story"
                            }
                            fill
                            sizes="(max-width: 700px) 100vw, 33vw"
                          />
                        </div>
                      )}

                      <div className="relatedBody">
                        <span className="relatedCategory">
                          {formatCategory(
                            related.category
                          )}
                        </span>

                        <h3 className="relatedTitle">
                          {related.title ||
                            "Read more"}
                        </h3>
                      </div>
                    </Link>
                  ))}
              </div>
            </section>
          )}
        </div>

        <aside className="sidebar">
          <div className="sidebarSticky">
            <DirectAd placement="article" />

            {relatedStories.length > 0 && (
              <div className="sideBox">
                <h2 className="sideTitle">
                  Latest Stories
                </h2>

                {relatedStories
                  .slice(0, 5)
                  .map((related) => (
                    <Link
                      href={`/news/${related.slug}`}
                      className="sideStory"
                      key={`side-${related.id}`}
                    >
                      {related.image_url && (
                        <div className="sideStoryImage">
                          <Image
                            src={related.image_url}
                            alt={
                              related.title ||
                              "News story"
                            }
                            fill
                            sizes="88px"
                          />
                        </div>
                      )}

                      <div>
                        <span className="sideStoryCategory">
                          {formatCategory(
                            related.category
                          )}
                        </span>

                        <h3 className="sideStoryTitle">
                          {related.title ||
                            "Read story"}
                        </h3>
                      </div>
                    </Link>
                  ))}
              </div>
            )}

            <DirectAd placement="article_middle" />
          </div>
        </aside>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            structuredData
          ),
        }}
      />

      {/* IMPORTANT: ArticleViewTracker expects newsId */}
      <ArticleViewTracker newsId={story.id} />

      <footer className="siteFooter">
        <div className="container">
          <div className="footerLinks">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">
              Privacy Policy
            </Link>
            <Link href="/terms">Terms</Link>
          </div>

          <p className="footerCopyright">
            © {new Date().getFullYear()} JNMulee News.
            All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}