import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DirectAd from "@/components/DirectAd";
import ShareButtons from "@/components/ShareButtons";
import ArticleViewTracker from "@/components/ArticleViewTracker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string }>;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news-jnnation.vercel.app";

const NAV_ITEMS = [
  ["Home", "/"],
  ["Nigeria", "/category/nigeria"],
  ["Politics", "/category/politics"],
  ["Sports", "/category/sports"],
  ["Entertainment", "/category/entertainment"],
  ["Gossip", "/category/gossip"],
  ["Business", "/category/business"],
  ["Technology", "/category/technology"],
  ["Crypto", "/category/crypto"],
  ["World", "/category/world"],
];

function decodeHtml(value: string) {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

/*
 * Keep article formatting while removing dangerous elements/attributes.
 * This is intentionally conservative because article content is rendered
 * with dangerouslySetInnerHTML.
 */
function sanitizeArticleHtml(value: string) {
  let html = decodeHtml(value);

  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<base[^>]*>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(
      /\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi,
      ""
    )
    .replace(
      /\s(href|src)\s*=\s*javascript:[^\s>]+/gi,
      ""
    )
    .replace(/javascript\s*:/gi, "");

  return html.trim();
}

function cleanText(value: string) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDescription(value: string) {
  const text = cleanText(value);

  if (!text) {
    return "Latest news from JNMulee News.";
  }

  if (text.length <= 160) {
    return text;
  }

  return `${text.substring(0, 157).trim()}...`;
}

function getImageFromContent(value: string) {
  const decoded = decodeHtml(value);

  const match = decoded.match(
    /<img[^>]+src=["']([^"']+)["']/i
  );

  return match?.[1] ?? null;
}

function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  } catch {
    return "";
  }
}

function formatDateTime(date: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return "";
  }
}

function timeAgo(date: string) {
  const timestamp = new Date(date).getTime();

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const difference = Date.now() - timestamp;
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDate(date);
}

function imageProxy(url: string | null) {
  if (!url) return "";

  return `/api/image?url=${encodeURIComponent(url)}`;
}

function getWordCount(value: string) {
  const text = cleanText(value);

  if (!text) return 0;

  return text.split(/\s+/).filter(Boolean).length;
}

async function postComment(formData: FormData) {
  "use server";

  const newsId = String(
    formData.get("news_id") || ""
  ).trim();

  const slug = String(
    formData.get("slug") || ""
  ).trim();

  const name = String(
    formData.get("name") || ""
  ).trim();

  const comment = String(
    formData.get("comment") || ""
  ).trim();

  if (!slug) {
    redirect("/");
  }

  if (!newsId || !name || !comment) {
    redirect(`/news/${slug}?comment=error#comments`);
  }

  if (name.length > 80 || comment.length > 2000) {
    redirect(`/news/${slug}?comment=error#comments`);
  }

  const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: article, error: articleError } =
    await supabaseServer
      .from("news")
      .select("id,slug")
      .eq("id", newsId)
      .eq("slug", slug)
      .eq("Published", true)
      .single();

  if (articleError || !article) {
    console.error(
      "Comment article validation error:",
      articleError
    );

    redirect(`/news/${slug}?comment=error#comments`);
  }

  /*
   * Supabase handles the final moderation decision through
   * the database trigger already configured for comments.
   */
  const { error: commentError } =
    await supabaseServer
      .from("comments")
      .insert({
        news_id: article.id,
        name,
        comment,
        approved: false,
      });

  if (commentError) {
    console.error(
      "Comment insert error:",
      commentError
    );

    redirect(`/news/${slug}?comment=error#comments`);
  }

  redirect(
    `/news/${slug}?comment=success#comments`
  );
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;

  const { data: story } = await supabase
    .from("news")
    .select(
      "title,content,image_url,slug,category,created_at"
    )
    .eq("slug", slug)
    .eq("Published", true)
    .single();

  if (!story) {
    return {
      title: "News | JNMulee News",
      description:
        "Latest news from JNMulee News.",
    };
  }

  const title =
    story.title || "JNMulee News";

  const description = getDescription(
    story.content || ""
  );

  const image =
    story.image_url ||
    getImageFromContent(
      story.content || ""
    );

  const articleUrl =
    `${SITE_URL}/news/${story.slug}`;

  return {
    title,
    description,

    metadataBase: new URL(SITE_URL),

    alternates: {
      canonical: articleUrl,
    },

    openGraph: {
      title,
      description,
      url: articleUrl,
      siteName: "JNMulee News",
      type: "article",
      publishedTime:
        story.created_at || undefined,
      section:
        story.category || "News",
      images: image
        ? [
            {
              url: image,
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

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function NewsArticlePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { comment: commentStatus } =
    await searchParams;

  const { data: story, error } = await supabase
    .from("news")
    .select(
      [
        "id",
        "title",
        "slug",
        "content",
        "image_url",
        "Published",
        "category",
        "created_at",
        "view_count",
        "content_type",
        "source_name",
        "canonical_url",
        "attribution_text",
      ].join(",")
    )
    .eq("slug", slug)
    .eq("Published", true)
    .single();

  if (error || !story) {
    notFound();
  }

  const title =
    story.title || "JNMulee News";

  const content =
    story.content || "";

  const description =
    getDescription(content);

  const image =
    story.image_url ||
    getImageFromContent(content);

  const publishedAt =
    story.created_at ||
    new Date().toISOString();

  const articleUrl =
    `${SITE_URL}/news/${story.slug}`;

  const category =
    story.category || "News";

  const articleHtml =
    sanitizeArticleHtml(content);

  const wordCount =
    getWordCount(content);

  const { data: comments } =
    await supabase
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

  const { data: relatedStories } =
    await supabase
      .from("news")
      .select(
        "id,title,slug,image_url,category,created_at"
      )
      .eq("Published", true)
      .eq("category", category)
      .neq("id", story.id)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .order("created_at", {
        ascending: false,
      })
      .limit(6);

  const { data: mostReadStories } =
    await supabase
      .from("news")
      .select(
        "id,title,slug,image_url,category,created_at,view_count"
      )
      .eq("Published", true)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .neq("id", story.id)
      .order("view_count", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(6);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description,
    image: image ? [image] : undefined,
    datePublished: publishedAt,
    dateModified: publishedAt,
    url: articleUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "JNMulee News",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.png`,
      },
    },
    author: {
      "@type": "Organization",
      name: "JNMulee News",
      url: SITE_URL,
    },
    articleSection: category,
    wordCount,
    inLanguage: "en-US",
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category,
        item: `${SITE_URL}/category/${category
          .toLowerCase()
          .replace(/\s+/g, "-")}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: articleUrl,
      },
    ],
  };

  return (
    <>
      <ArticleViewTracker
        newsId={story.id}
      />

      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #f5f6f8;
          color: #111827;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        a {
          text-decoration: none;
          color: inherit;
        }

        .article-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #d7193f;
          color: #fff;
          box-shadow: 0 3px 15px rgba(0,0,0,.16);
        }

        .article-header-inner {
          max-width: 1280px;
          min-height: 68px;
          margin: 0 auto;
          padding: 0 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
        }

        .article-logo {
          color: #fff;
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -.7px;
          white-space: nowrap;
        }

        .header-search {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-search a {
          color: #fff;
          border: 1px solid rgba(255,255,255,.35);
          border-radius: 7px;
          padding: 8px 13px;
          font-size: 13px;
          font-weight: 800;
        }

        .article-nav {
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          overflow-x: auto;
          white-space: nowrap;
        }

        .article-nav-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 10px 22px;
          display: flex;
          gap: 21px;
        }

        .article-nav a {
          color: #374151;
          font-size: 13px;
          font-weight: 800;
        }

        .article-nav a:hover {
          color: #d7193f;
        }

        .breaking-bar {
          background: #fff;
          border-bottom: 1px solid #eee;
        }

        .breaking-inner {
          max-width: 1280px;
          margin: 0 auto;
          min-height: 40px;
          padding: 0 22px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .breaking-label {
          background: #d7193f;
          color: #fff;
          border-radius: 3px;
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .breaking-text {
          color: #555e6b;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 600;
        }

        .article-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 30px 22px 70px;
        }

        .article-layout {
          display: grid;
          grid-template-columns: minmax(0, 850px) 310px;
          gap: 32px;
          align-items: start;
          justify-content: center;
        }

        .article-main {
          min-width: 0;
        }

        .article-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 28px;
          box-shadow: 0 3px 14px rgba(0,0,0,.045);
        }

        .breadcrumb {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
          margin-bottom: 15px;
          color: #7b8490;
          font-size: 12px;
          font-weight: 700;
        }

        .breadcrumb a {
          color: #d7193f;
        }

        .article-category {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #d7193f;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .65px;
          margin-bottom: 10px;
        }

        .category-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #d7193f;
        }

        .article-title {
          margin: 0;
          color: #111827;
          font-size: clamp(34px, 5vw, 55px);
          line-height: 1.06;
          letter-spacing: -1.8px;
          font-weight: 900;
        }

        .article-dek {
          margin: 17px 0 0;
          color: #5f6875;
          font-size: 18px;
          line-height: 1.6;
        }

        .article-meta {
          margin-top: 19px;
          padding: 15px 0;
          border-top: 1px solid #edf0f2;
          border-bottom: 1px solid #edf0f2;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px 15px;
          color: #737c87;
          font-size: 12px;
          font-weight: 600;
        }

        .article-meta strong {
          color: #252b33;
        }

        .article-hero {
          width: 100%;
          max-height: 590px;
          margin: 23px 0 27px;
          display: block;
          object-fit: cover;
          border-radius: 10px;
        }

        .article-caption {
          margin: -18px 0 25px;
          color: #858d97;
          font-size: 11px;
          line-height: 1.5;
        }

        .article-content {
          color: #20242a;
          font-size: 18px;
          line-height: 1.85;
          overflow-wrap: anywhere;
        }

        .article-content p {
          margin: 0 0 22px;
        }

        .article-content h2 {
          margin: 35px 0 14px;
          color: #111827;
          font-size: 29px;
          line-height: 1.2;
          font-weight: 900;
        }

        .article-content h3 {
          margin: 30px 0 12px;
          color: #111827;
          font-size: 23px;
          line-height: 1.25;
          font-weight: 900;
        }

        .article-content img {
          display: block;
          width: 100%;
          max-width: 100%;
          height: auto;
          margin: 25px auto;
          border-radius: 9px;
        }

        .article-content a {
          color: #c41438;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .article-content ul,
        .article-content ol {
          margin: 0 0 23px;
          padding-left: 25px;
        }

        .article-content li {
          margin-bottom: 9px;
        }

        .article-content blockquote {
          margin: 28px 0;
          padding: 17px 20px;
          border-left: 5px solid #d7193f;
          background: #f8f9fa;
          color: #4b5563;
          font-size: 19px;
          font-style: italic;
        }

        .article-content strong {
          color: #111827;
        }

        .share-box {
          margin-top: 30px;
          padding-top: 22px;
          border-top: 1px solid #e8eaed;
        }

        .share-title {
          margin-bottom: 10px;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .5px;
          color: #555e69;
        }

        .attribution {
          margin-top: 23px;
          padding: 15px 17px;
          border-left: 4px solid #d7193f;
          background: #f8f9fa;
          color: #59616d;
          font-size: 13px;
          line-height: 1.6;
        }

        .ad-space {
          margin: 25px 0;
        }

        .sidebar {
          min-width: 0;
        }

        .sidebar-box {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 11px;
          overflow: hidden;
          box-shadow: 0 3px 13px rgba(0,0,0,.045);
        }

        .sidebar-title {
          padding: 16px 17px;
          border-bottom: 1px solid #e8eaed;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 17px;
          font-weight: 900;
        }

        .sidebar-title::before {
          content: "";
          width: 4px;
          height: 20px;
          background: #d7193f;
          border-radius: 3px;
        }

        .sidebar-story {
          padding: 13px;
          border-bottom: 1px solid #edf0f2;
        }

        .sidebar-story:last-child {
          border-bottom: 0;
        }

        .sidebar-story a {
          display: grid;
          grid-template-columns: 91px minmax(0, 1fr);
          gap: 11px;
        }

        .sidebar-image {
          width: 91px;
          height: 70px;
          overflow: hidden;
          border-radius: 7px;
          background: #e5e7eb;
        }

        .sidebar-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .sidebar-category {
          color: #d7193f;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .sidebar-story h3 {
          margin: 4px 0 0;
          font-size: 13px;
          line-height: 1.34;
          font-weight: 800;
        }

        .sidebar-time {
          margin-top: 6px;
          color: #9299a2;
          font-size: 10px;
        }

        .sidebar-ad {
          margin-top: 20px;
        }

        .comments {
          margin-top: 45px;
        }

        .comments-heading {
          margin: 0 0 18px;
          font-size: 27px;
          font-weight: 900;
        }

        .comment-message {
          border-radius: 9px;
          padding: 13px 15px;
          margin-bottom: 17px;
          font-size: 13px;
          font-weight: 700;
        }

        .comment-success {
          background: #eaf8ee;
          color: #176b2c;
          border: 1px solid #b9e6c4;
        }

        .comment-error {
          background: #fff1f1;
          color: #a40000;
          border: 1px solid #f0b7b7;
        }

        .comment-form {
          padding: 20px;
          background: #fafafa;
          border: 1px solid #e5e7eb;
          border-radius: 11px;
          margin-bottom: 28px;
        }

        .form-label {
          display: block;
          margin-bottom: 7px;
          color: #242932;
          font-size: 13px;
          font-weight: 800;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          border: 1px solid #d9dde2;
          border-radius: 8px;
          padding: 12px;
          outline: none;
          font: inherit;
          background: #fff;
          color: #111827;
        }

        .form-input:focus,
        .form-textarea:focus {
          border-color: #d7193f;
          box-shadow: 0 0 0 2px rgba(215,25,63,.08);
        }

        .form-input {
          margin-bottom: 16px;
        }

        .form-textarea {
          min-height: 135px;
          resize: vertical;
          margin-bottom: 14px;
        }

        .comment-submit {
          border: 0;
          border-radius: 8px;
          background: #d7193f;
          color: #fff;
          padding: 12px 20px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .comment-note {
          margin: 9px 0 0;
          color: #858c95;
          font-size: 11px;
          line-height: 1.5;
        }

        .comment-item {
          padding: 17px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .comment-name {
          color: #171b20;
          font-size: 14px;
          font-weight: 900;
        }

        .comment-date {
          margin-top: 4px;
          color: #8a929d;
          font-size: 11px;
        }

        .comment-text {
          margin-top: 9px;
          color: #454c55;
          font-size: 14px;
          line-height: 1.65;
          white-space: pre-wrap;
        }

        .related {
          margin-top: 48px;
        }

        .section-heading {
          margin: 0 0 17px;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 25px;
          font-weight: 900;
        }

        .section-heading::before {
          content: "";
          width: 5px;
          height: 25px;
          background: #d7193f;
          border-radius: 4px;
        }

        .related-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 17px;
        }

        .related-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 9px;
          overflow: hidden;
          transition:
            transform .2s ease,
            box-shadow .2s ease;
        }

        .related-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,.08);
        }

        .related-card img {
          width: 100%;
          height: 145px;
          display: block;
          object-fit: cover;
        }

        .related-body {
          padding: 13px;
        }

        .related-category {
          color: #d7193f;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .related-title {
          margin-top: 6px;
          font-size: 15px;
          line-height: 1.35;
          font-weight: 850;
        }

        .related-time {
          margin-top: 8px;
          color: #9097a0;
          font-size: 10px;
        }

        .footer {
          background: #111827;
          color: #fff;
          padding: 38px 22px;
        }

        .footer-inner {
          max-width: 1280px;
          margin: 0 auto;
        }

        .footer-brand {
          font-size: 23px;
          font-weight: 900;
          margin-bottom: 17px;
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 20px;
        }

        .footer-links a {
          color: #fff;
          font-size: 13px;
          font-weight: 700;
        }

        .footer-copy {
          color: #9ca3af;
          font-size: 12px;
        }

        @media (max-width: 1050px) {
          .article-layout {
            grid-template-columns: minmax(0, 1fr) 280px;
            gap: 22px;
          }
        }

        @media (max-width: 850px) {
          .article-header-inner {
            min-height: auto;
            padding: 14px 16px;
          }

          .article-nav-inner {
            padding: 10px 16px;
          }

          .article-container {
            padding: 22px 15px 55px;
          }

          .article-layout {
            display: block;
          }

          .sidebar {
            margin-top: 30px;
          }

          .article-card {
            padding: 21px;
          }
        }

        @media (max-width: 600px) {
          .article-logo {
            font-size: 22px;
          }

          .header-search a {
            padding: 7px 10px;
            font-size: 12px;
          }

          .article-title {
            font-size: 34px;
            letter-spacing: -1px;
          }

          .article-dek {
            font-size: 16px;
          }

          .article-content {
            font-size: 17px;
            line-height: 1.78;
          }

          .article-content h2 {
            font-size: 25px;
          }

          .article-content h3 {
            font-size: 21px;
          }

          .article-card {
            border-radius: 9px;
            padding: 17px;
          }

          .article-hero {
            margin-top: 18px;
            border-radius: 8px;
          }

          .related-grid {
            grid-template-columns: 1fr;
          }

          .related-card img {
            height: 180px;
          }

          .article-meta {
            gap: 8px 11px;
          }

          .footer {
            padding: 30px 15px;
          }
        }
      `}</style>

      <header className="article-header">
        <div className="article-header-inner">
          <Link
            href="/"
            className="article-logo"
          >
            JNMulee News
          </Link>

          <div className="header-search">
            <Link href="/search">
              Search
            </Link>
          </div>
        </div>
      </header>

      <nav className="article-nav">
        <div className="article-nav-inner">
          {NAV_ITEMS.map(([label, href]) => (
            <Link
              key={href}
              href={href}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="breaking-bar">
        <div className="breaking-inner">
          <span className="breaking-label">
            Latest
          </span>

          <span className="breaking-text">
            {title}
          </span>
        </div>
      </div>

      <main className="article-container">
        <div className="article-layout">
          <div className="article-main">
            <article className="article-card">
              <div className="breadcrumb">
                <Link href="/">Home</Link>
                <span>›</span>
                <Link
                  href={`/category/${category
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                >
                  {category}
                </Link>
                <span>›</span>
                <span>Article</span>
              </div>

              <div className="article-category">
                <span className="category-dot" />
                {category}
              </div>

              <h1 className="article-title">
                {title}
              </h1>

              <p className="article-dek">
                {description}
              </p>

              <div className="article-meta">
                <span>
                  <strong>JNMulee News</strong>
                </span>

                <span>•</span>

                <span>
                  Published{" "}
                  {formatDate(publishedAt)}
                </span>

                <span>•</span>

                <span>
                  {timeAgo(publishedAt)}
                </span>

                {story.view_count !==
                  null &&
                  story.view_count !==
                    undefined && (
                    <>
                      <span>•</span>
                      <span>
                        {Number(
                          story.view_count
                        ).toLocaleString()}{" "}
                        views
                      </span>
                    </>
                  )}
              </div>

              {image && (
                <>
                  <img
                    className="article-hero"
                    src={imageProxy(image)}
                    alt={title}
                  />

                  <div className="article-caption">
                    {category} news — JNMulee News
                  </div>
                </>
              )}

              <div
                className="article-content"
                dangerouslySetInnerHTML={{
                  __html: articleHtml,
                }}
              />

              {story.attribution_text && (
                <div className="attribution">
                  {story.attribution_text}
                </div>
              )}

              <div className="share-box">
                <div className="share-title">
                  Share this story
                </div>

                <ShareButtons
                  title={title}
                  url={articleUrl}
                />
              </div>

              <div className="ad-space">
                <DirectAd
                  placement="article"
                />
              </div>
            </article>

            {relatedStories &&
              relatedStories.length > 0 && (
                <section className="related">
                  <h2 className="section-heading">
                    Related Stories
                  </h2>

                  <div className="related-grid">
                    {relatedStories.map(
                      (related) => (
                        <Link
                          key={related.id}
                          href={`/news/${related.slug}`}
                          className="related-card"
                        >
                          {related.image_url && (
                            <img
                              src={imageProxy(
                                related.image_url
                              )}
                              alt={
                                related.title
                              }
                              loading="lazy"
                            />
                          )}

                          <div className="related-body">
                            <div className="related-category">
                              {related.category ||
                                "News"}
                            </div>

                            <div className="related-title">
                              {related.title}
                            </div>

                            <div className="related-time">
                              {timeAgo(
                                related.created_at
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    )}
                  </div>
                </section>
              )}

            <section
              id="comments"
              className="comments"
            >
              <h2 className="comments-heading">
                Comments
              </h2>

              {commentStatus ===
                "success" && (
                <div className="comment-message comment-success">
                  Your comment was submitted
                  successfully.
                </div>
              )}

              {commentStatus ===
                "error" && (
                <div className="comment-message comment-error">
                  We could not post your
                  comment. Please check your
                  information and try again.
                </div>
              )}

              <form
                action={postComment}
                className="comment-form"
              >
                <input
                  type="hidden"
                  name="news_id"
                  value={story.id}
                />

                <input
                  type="hidden"
                  name="slug"
                  value={story.slug}
                />

                <label
                  htmlFor="name"
                  className="form-label"
                >
                  Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Your name"
                  className="form-input"
                />

                <label
                  htmlFor="comment"
                  className="form-label"
                >
                  Comment
                </label>

                <textarea
                  id="comment"
                  name="comment"
                  required
                  maxLength={2000}
                  placeholder="Write your comment..."
                  className="form-textarea"
                />

                <button
                  type="submit"
                  className="comment-submit"
                >
                  Post Comment
                </button>

                <p className="comment-note">
                  Comments containing prohibited
                  or abusive content may be
                  blocked automatically.
                </p>
              </form>

              {comments &&
              comments.length > 0 ? (
                <div>
                  {comments.map(
                    (comment) => (
                      <div
                        key={comment.id}
                        className="comment-item"
                      >
                        <div className="comment-name">
                          {comment.name}
                        </div>

                        <div className="comment-date">
                          {formatDateTime(
                            comment.created_at
                          )}
                        </div>

                        <div className="comment-text">
                          {comment.comment}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p
                  style={{
                    color: "#7b838d",
                    fontSize: "14px",
                  }}
                >
                  No approved comments yet.
                  Be the first to comment.
                </p>
              )}
            </section>
          </div>

          <aside className="sidebar">
            <div className="sidebar-box">
              <div className="sidebar-title">
                Most Read
              </div>

              {mostReadStories &&
              mostReadStories.length > 0 ? (
                mostReadStories.map(
                  (mostRead) => (
                    <div
                      key={mostRead.id}
                      className="sidebar-story"
                    >
                      <Link
                        href={`/news/${mostRead.slug}`}
                      >
                        <div className="sidebar-image">
                          {mostRead.image_url && (
                            <img
                              src={imageProxy(
                                mostRead.image_url
                              )}
                              alt={
                                mostRead.title
                              }
                              loading="lazy"
                            />
                          )}
                        </div>

                        <div>
                          <div className="sidebar-category">
                            {mostRead.category ||
                              "News"}
                          </div>

                          <h3>
                            {mostRead.title}
                          </h3>

                          <div className="sidebar-time">
                            {timeAgo(
                              mostRead.created_at
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  )
                )
              ) : (
                <div
                  style={{
                    padding: "18px",
                    color: "#777",
                    fontSize: "13px",
                  }}
                >
                  Most-read stories will
                  appear here.
                </div>
              )}
            </div>

            <div className="sidebar-ad">
              <DirectAd
                placement="article_sidebar"
              />
            </div>

            <div className="sidebar-ad">
              <DirectAd
                placement="article_sidebar_2"
              />
            </div>
          </aside>
        </div>

        <div className="ad-space">
          <DirectAd
            placement="article_middle"
          />
        </div>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            JNMulee News
          </div>

          <div className="footer-links">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">
              Contact
            </Link>
            <Link href="/privacy">
              Privacy Policy
            </Link>
            <Link href="/terms">
              Terms
            </Link>
          </div>

          <div className="footer-copy">
            © {new Date().getFullYear()} JNMulee
            News. All rights reserved.
          </div>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              structuredData
            ),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              breadcrumbData
            ),
        }}
      />
    </>
  );
}