import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

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

/* =========================================================
   CATEGORY CONFIGURATION
========================================================= */

const CATEGORIES = [
  { name: "Top Stories", slug: "news" },
  { name: "Nigeria", slug: "nigeria" },
  { name: "World", slug: "world" },
  { name: "Politics", slug: "politics" },
  { name: "Business", slug: "business" },
  { name: "Technology", slug: "technology" },
  { name: "Sports", slug: "sports" },
  { name: "Entertainment", slug: "entertainment" },
  { name: "Gossip", slug: "gossip" },
  { name: "Crypto", slug: "crypto" },
] as const;

type CategoryConfig = (typeof CATEGORIES)[number];

type Story = {
  id: string;
  title: string | null;
  slug: string | null;
  content: string | null;
  image_url: string | null;
  category: string | null;
  created_at: string | null;
  view_count: number | null;
};

/* =========================================================
   HELPERS
========================================================= */

function getCategoryBySlug(
  slug: string
): CategoryConfig | null {
  const normalized = slug.trim().toLowerCase();

  const actualSlug =
    normalized === "sport"
      ? "sports"
      : normalized;

  return (
    CATEGORIES.find(
      (category) =>
        category.slug === actualSlug
    ) || null
  );
}

function cleanText(
  content: string | null
): string {
  if (!content) return "";

  return content
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getExcerpt(
  content: string | null,
  length = 180
): string {
  const text = cleanText(content);

  if (!text) {
    return "Read the full story on JNMulee News.";
  }

  if (text.length <= length) {
    return text;
  }

  const shortened = text
    .slice(0, length)
    .replace(/\s+\S*$/, "")
    .trim();

  return `${shortened}...`;
}

function formatDate(
  value: string | null
): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
}

function timeAgo(
  value: string | null
): string {
  if (!value) return "";

  const timestamp =
    new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const seconds = Math.max(
    0,
    Math.floor(
      (Date.now() - timestamp) / 1000
    )
  );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDate(value);
}

function validImage(
  value: string | null
): boolean {
  return !!value && /^https?:\/\//i.test(value);
}

/* =========================================================
   STORY CARD
========================================================= */

function StoryCard({
  story,
}: {
  story: Story;
}) {
  const hasImage =
    validImage(story.image_url);

  return (
    <article className="category-story-card">
      <Link
        href={`/news/${story.slug}`}
        className="category-story-link"
      >
        {hasImage ? (
          <div className="category-story-image">
            <Image
              src={story.image_url!}
              alt={
                story.title ||
                "JNMulee News story"
              }
              fill
              sizes="
                (max-width: 700px) 100vw,
                (max-width: 1100px) 50vw,
                33vw
              "
              className="category-story-image-element"
            />
          </div>
        ) : (
          <div className="category-image-placeholder">
            JNMulee News
          </div>
        )}

        <div className="category-story-body">
          <div className="category-story-label">
            {story.category || "News"}
          </div>

          <h2 className="category-story-title">
            {story.title ||
              "Untitled Story"}
          </h2>

          <p className="category-story-excerpt">
            {getExcerpt(story.content)}
          </p>

          <div className="category-story-meta">
            <span>
              {timeAgo(story.created_at)}
            </span>

            <span className="meta-dot">
              •
            </span>

            <span>
              {formatDate(
                story.created_at
              )}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

/* =========================================================
   FEATURED STORY
========================================================= */

function FeaturedStory({
  story,
}: {
  story: Story;
}) {
  const hasImage =
    validImage(story.image_url);

  return (
    <article className="category-featured">
      <Link
        href={`/news/${story.slug}`}
        className="category-featured-link"
      >
        <div className="category-featured-image">
          {hasImage ? (
            <Image
              src={story.image_url!}
              alt={
                story.title ||
                "JNMulee News"
              }
              fill
              priority
              sizes="
                (max-width: 900px) 100vw,
                66vw
              "
              className="category-featured-image-element"
            />
          ) : (
            <div className="category-featured-placeholder">
              JNMulee News
            </div>
          )}

          <div className="category-featured-overlay" />

          <div className="category-featured-content">
            <div className="category-featured-tag">
              {story.category || "News"}
            </div>

            <h2 className="category-featured-title">
              {story.title ||
                "Latest News"}
            </h2>

            <p className="category-featured-excerpt">
              {getExcerpt(
                story.content,
                250
              )}
            </p>

            <div className="category-featured-meta">
              {timeAgo(story.created_at)}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

/* =========================================================
   COMPACT STORY
========================================================= */

function CompactStory({
  story,
}: {
  story: Story;
}) {
  const hasImage =
    validImage(story.image_url);

  return (
    <Link
      href={`/news/${story.slug}`}
      className="category-compact"
    >
      {hasImage ? (
        <div className="category-compact-image">
          <Image
            src={story.image_url!}
            alt={
              story.title ||
              "JNMulee News"
            }
            fill
            sizes="96px"
            className="category-compact-image-element"
          />
        </div>
      ) : (
        <div className="category-compact-placeholder">
          News
        </div>
      )}

      <div className="category-compact-body">
        <div className="category-compact-label">
          {story.category || "News"}
        </div>

        <div className="category-compact-title">
          {story.title ||
            "Latest News"}
        </div>

        <div className="category-compact-date">
          {timeAgo(story.created_at)}
        </div>
      </div>
    </Link>
  );
}

/* =========================================================
   MOST READ
========================================================= */

function MostReadItem({
  story,
  number,
}: {
  story: Story;
  number: number;
}) {
  return (
    <Link
      href={`/news/${story.slug}`}
      className="category-most-read-item"
    >
      <div className="category-most-read-number">
        {String(number).padStart(2, "0")}
      </div>

      <div>
        <div className="category-most-read-label">
          {story.category || "News"}
        </div>

        <div className="category-most-read-title">
          {story.title ||
            "Latest News"}
        </div>

        <div className="category-most-read-views">
          {Number(
            story.view_count || 0
          ).toLocaleString()}{" "}
          views
        </div>
      </div>
    </Link>
  );
}

/* =========================================================
   STATIC PARAMS
========================================================= */

export function generateStaticParams() {
  return CATEGORIES.map(
    (category) => ({
      category: category.slug,
    })
  );
}

/* =========================================================
   METADATA
========================================================= */

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    category: string;
  }>;
}): Promise<Metadata> {
  const { category } =
    await params;

  const config =
    getCategoryBySlug(category);

  if (!config) {
    return {
      title:
        "Category Not Found | JNMulee News",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title =
    config.slug === "news"
      ? "Latest News | JNMulee News"
      : `${config.name} News | JNMulee News`;

  const description =
    config.slug === "news"
      ? "Read the latest breaking news and stories from JNMulee News."
      : `Latest ${config.name} news, stories and updates from JNMulee News.`;

  return {
    metadataBase:
      new URL(SITE_URL),

    title,

    description,

    alternates: {
      canonical:
        `${SITE_URL}/category/${config.slug}`,
    },

    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },

    openGraph: {
      type: "website",
      title,
      description,
      url:
        `${SITE_URL}/category/${config.slug}`,
      siteName: "JNMulee News",
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/* =========================================================
   PAGE
========================================================= */

export default async function CategoryPage({
  params,
}: {
  params: Promise<{
    category: string;
  }>;
}) {
  const { category } =
    await params;

  const config =
    getCategoryBySlug(category);

  if (!config) {
    notFound();
  }

  const storySelect =
    "id,title,slug,content,image_url,category,created_at,view_count";

  let query =
    supabase
      .from("news")
      .select(storySelect)
      .eq("Published", true)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .not("slug", "is", null);

  if (config.slug !== "news") {
    query = query.eq(
      "category",
      config.name
    );
  }

  const {
    data,
    error,
  } = await query
    .order("created_at", {
      ascending: false,
    })
    .limit(60);

  if (error) {
    console.error(
      "Category query error:",
      error
    );
  }

  const stories =
    (data || []) as Story[];

  const {
    data: mostReadData,
  } = await supabase
    .from("news")
    .select(storySelect)
    .eq("Published", true)
    .not("image_url", "is", null)
    .neq("image_url", "")
    .not("slug", "is", null)
    .order("view_count", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    })
    .limit(5);

  const mostRead =
    (mostReadData || []) as Story[];

  const featured =
    stories[0] || null;

  const secondary =
    stories.slice(1, 5);

  const remaining =
    stories.slice(5);

  return (
    <main className="jn-category-page">
      <style>{`
        .jn-category-page {
          min-height: 100vh;
          background: #f7f9fc;
          color: #172033;
          padding: 30px 0 70px;
        }

        .jn-category-container {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
        }

        .jn-category-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          color: #718096;
          font-size: 13px;
        }

        .jn-category-breadcrumb a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 800;
        }

        .jn-category-breadcrumb a:hover {
          text-decoration: underline;
        }

        .jn-category-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 25px;
          margin-bottom: 28px;
        }

        .jn-category-eyebrow {
          margin-bottom: 8px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .jn-category-title {
          margin: 0;
          color: #0b1220;
          font-size: clamp(38px, 5vw, 58px);
          line-height: .98;
          letter-spacing: -2.5px;
          font-weight: 950;
        }

        .jn-category-description {
          max-width: 680px;
          margin: 13px 0 0;
          color: #657085;
          font-size: 15px;
          line-height: 1.7;
        }

        .jn-category-count {
          flex: 0 0 auto;
          padding: 9px 13px;
          border: 1px solid #dce3ed;
          border-radius: 999px;
          background: #ffffff;
          color: #526078;
          font-size: 12px;
          font-weight: 800;
        }

        .jn-category-featured-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1.55fr)
            minmax(300px, .75fr);
          gap: 24px;
          margin-bottom: 35px;
        }

        .category-featured {
          min-width: 0;
          overflow: hidden;
          border: 1px solid #dce3ed;
          border-radius: 20px;
          background: #0b1220;
          box-shadow:
            0 14px 40px rgba(11,18,32,.09);
        }

        .category-featured-link {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .category-featured-image {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
        }

        .category-featured-image-element {
          object-fit: cover;
          transition: transform .4s ease;
        }

        .category-featured:hover
        .category-featured-image-element {
          transform: scale(1.035);
        }

        .category-featured-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              #0b1220,
              #1d4ed8
            );
          color: #ffffff;
          font-size: 20px;
          font-weight: 950;
        }

        .category-featured-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to top,
              rgba(5,10,20,.92) 0%,
              rgba(5,10,20,.48) 42%,
              rgba(5,10,20,.02) 78%
            );
        }

        .category-featured-content {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 26px;
          color: #ffffff;
        }

        .category-featured-tag {
          display: inline-flex;
          margin-bottom: 10px;
          padding: 5px 9px;
          border-radius: 999px;
          background: #2563eb;
          color: #ffffff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .7px;
          text-transform: uppercase;
        }

        .category-featured-title {
          margin: 0;
          max-width: 850px;
          color: #ffffff;
          font-size: clamp(27px, 4vw, 44px);
          line-height: 1.06;
          letter-spacing: -1.4px;
          font-weight: 950;
        }

        .category-featured-excerpt {
          max-width: 760px;
          margin: 12px 0 0;
          color: rgba(255,255,255,.82);
          font-size: 14px;
          line-height: 1.6;
        }

        .category-featured-meta {
          margin-top: 12px;
          color: #bfdbfe;
          font-size: 11px;
          font-weight: 700;
        }

        .jn-category-secondary {
          min-width: 0;
          padding: 21px;
          border: 1px solid #dce3ed;
          border-radius: 18px;
          background: #ffffff;
          box-shadow:
            0 8px 28px rgba(11,18,32,.05);
        }

        .jn-category-secondary-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e7edf5;
        }

        .jn-category-secondary-header strong {
          color: #0b1220;
          font-size: 19px;
          font-weight: 950;
        }

        .jn-category-secondary-header a {
          color: #2563eb;
          text-decoration: none;
          font-size: 12px;
          font-weight: 850;
        }

        .jn-category-secondary-list {
          display: grid;
          gap: 13px;
        }

        .category-compact {
          display: grid;
          grid-template-columns: 94px minmax(0,1fr);
          gap: 12px;
          min-width: 0;
          padding-bottom: 13px;
          border-bottom: 1px solid #e8edf4;
          color: inherit;
          text-decoration: none;
        }

        .category-compact:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .category-compact-image,
        .category-compact-placeholder {
          position: relative;
          width: 94px;
          height: 72px;
          overflow: hidden;
          border-radius: 9px;
          background: #e9eef5;
        }

        .category-compact-image-element {
          object-fit: cover;
          transition: transform .3s ease;
        }

        .category-compact:hover
        .category-compact-image-element {
          transform: scale(1.05);
        }

        .category-compact-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #718096;
          font-size: 10px;
          font-weight: 800;
        }

        .category-compact-body {
          min-width: 0;
        }

        .category-compact-label {
          margin-bottom: 4px;
          overflow: hidden;
          color: #2563eb;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .7px;
          text-transform: uppercase;
        }

        .category-compact-title {
          display: -webkit-box;
          overflow: hidden;
          color: #172033;
          font-size: 14px;
          line-height: 1.32;
          font-weight: 850;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }

        .category-compact-date {
          margin-top: 5px;
          color: #8a95a8;
          font-size: 10px;
        }

        .category-compact:hover
        .category-compact-title {
          color: #2563eb;
        }

        .jn-category-ad {
          margin: 30px 0;
        }

        .jn-category-most-read {
          margin: 40px 0;
          padding: 24px;
          border: 1px solid #dce3ed;
          border-top: 4px solid #2563eb;
          border-radius: 17px;
          background: #ffffff;
          box-shadow:
            0 8px 28px rgba(11,18,32,.04);
        }

        .jn-category-section-header {
          margin-bottom: 20px;
        }

        .jn-category-section-eyebrow {
          margin-bottom: 6px;
          color: #2563eb;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.2px;
          text-transform: uppercase;
        }

        .jn-category-section-title {
          margin: 0;
          color: #0b1220;
          font-size: 29px;
          line-height: 1;
          letter-spacing: -.9px;
          font-weight: 950;
        }

        .jn-category-most-read-grid {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0,1fr));
          gap: 17px;
        }

        .category-most-read-item {
          display: block;
          min-width: 0;
          color: inherit;
          text-decoration: none;
        }

        .category-most-read-number {
          margin-bottom: 9px;
          color: #2563eb;
          font-size: 29px;
          line-height: 1;
          font-weight: 950;
        }

        .category-most-read-label {
          margin-bottom: 5px;
          color: #2563eb;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .6px;
          text-transform: uppercase;
        }

        .category-most-read-title {
          display: -webkit-box;
          overflow: hidden;
          color: #172033;
          font-size: 14px;
          line-height: 1.38;
          font-weight: 850;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 4;
        }

        .category-most-read-views {
          margin-top: 7px;
          color: #8a95a8;
          font-size: 10px;
        }

        .category-most-read-item:hover
        .category-most-read-title {
          color: #2563eb;
        }

        .jn-category-latest-heading {
          display: flex;
          align-items: center;
          gap: 18px;
          margin: 45px 0 20px;
        }

        .jn-category-latest-heading h2 {
          flex: 0 0 auto;
          margin: 0;
          color: #0b1220;
          font-size: 30px;
          line-height: 1;
          letter-spacing: -1px;
          font-weight: 950;
        }

        .jn-category-latest-line {
          width: 100%;
          height: 2px;
          background: #2563eb;
          opacity: .28;
        }

        .jn-category-story-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0,1fr));
          gap: 21px;
        }

        .category-story-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid #dce3ed;
          border-radius: 15px;
          background: #ffffff;
          box-shadow:
            0 7px 25px rgba(11,18,32,.045);
          transition:
            transform .2s ease,
            box-shadow .2s ease;
        }

        .category-story-card:hover {
          transform: translateY(-3px);
          box-shadow:
            0 16px 34px rgba(11,18,32,.09);
        }

        .category-story-link {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .category-story-image,
        .category-image-placeholder {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #e9eef5;
        }

        .category-story-image-element {
          object-fit: cover;
          transition: transform .3s ease;
        }

        .category-story-card:hover
        .category-story-image-element {
          transform: scale(1.035);
        }

        .category-image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              #0b1220,
              #2563eb
            );
          color: #ffffff;
          font-size: 14px;
          font-weight: 950;
          letter-spacing: .7px;
        }

        .category-story-body {
          padding: 17px;
          border-top: 3px solid #2563eb;
        }

        .category-story-label {
          margin-bottom: 8px;
          color: #2563eb;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .7px;
          text-transform: uppercase;
        }

        .category-story-title {
          margin: 0;
          color: #172033;
          font-size: 19px;
          line-height: 1.27;
          letter-spacing: -.3px;
          font-weight: 900;
        }

        .category-story-excerpt {
          margin: 10px 0 13px;
          color: #68758a;
          font-size: 13px;
          line-height: 1.6;
        }

        .category-story-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          color: #8a95a8;
          font-size: 11px;
        }

        .meta-dot {
          color: #2563eb;
          font-weight: 900;
        }

        .jn-category-empty {
          padding: 70px 25px;
          border: 1px solid #dce3ed;
          border-top: 4px solid #2563eb;
          border-radius: 17px;
          background: #ffffff;
          text-align: center;
        }

        .jn-category-empty-icon {
          width: 62px;
          height: 62px;
          margin: 0 auto 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          font-size: 24px;
          font-weight: 950;
        }

        .jn-category-empty h2 {
          margin: 0 0 9px;
          color: #0b1220;
          font-size: 25px;
        }

        .jn-category-empty p {
          max-width: 550px;
          margin: 0 auto;
          color: #6b7587;
          line-height: 1.65;
        }

        .jn-category-more-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0,1fr));
          gap: 13px;
        }

        .jn-category-more-card {
          display: block;
          padding: 16px;
          border: 1px solid #dce3ed;
          border-radius: 12px;
          background: #ffffff;
          color: inherit;
          text-decoration: none;
          transition:
            transform .2s ease,
            border-color .2s ease,
            box-shadow .2s ease;
        }

        .jn-category-more-card:hover {
          transform: translateY(-2px);
          border-color: #93b4f8;
          box-shadow:
            0 10px 24px rgba(11,18,32,.06);
        }

        .jn-category-more-name {
          color: #2563eb;
          font-size: 14px;
          font-weight: 900;
        }

        .jn-category-more-text {
          margin-top: 5px;
          color: #718096;
          font-size: 11px;
          line-height: 1.45;
        }

        @media (max-width: 1050px) {
          .jn-category-featured-layout {
            grid-template-columns: 1fr;
          }

          .jn-category-most-read-grid {
            grid-template-columns:
              repeat(3, minmax(0,1fr));
          }

          .jn-category-story-grid {
            grid-template-columns:
              repeat(2, minmax(0,1fr));
          }

          .jn-category-more-grid {
            grid-template-columns:
              repeat(3, minmax(0,1fr));
          }
        }

        @media (max-width: 700px) {
          .jn-category-page {
            padding-top: 22px;
          }

          .jn-category-container {
            width:
              min(100% - 22px, 1240px);
          }

          .jn-category-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
          }

          .jn-category-title {
            font-size: 40px;
            letter-spacing: -1.6px;
          }

          .category-featured-content {
            padding: 20px;
          }

          .category-featured-title {
            font-size: 29px;
          }

          .jn-category-secondary {
            padding: 18px;
          }

          .jn-category-most-read {
            padding: 19px;
          }

          .jn-category-most-read-grid {
            grid-template-columns:
              repeat(2, minmax(0,1fr));
          }

          .jn-category-story-grid {
            grid-template-columns: 1fr;
          }

          .jn-category-more-grid {
            grid-template-columns:
              repeat(2, minmax(0,1fr));
          }

          .jn-category-latest-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 9px;
          }
        }

        @media (max-width: 430px) {
          .jn-category-most-read-grid {
            grid-template-columns: 1fr;
          }

          .jn-category-more-grid {
            grid-template-columns: 1fr;
          }

          .category-featured-title {
            font-size: 26px;
          }

          .category-story-title {
            font-size: 18px;
          }
        }
      `}</style>

      <div className="jn-category-container">
        {/* BREADCRUMB */}

        <div className="jn-category-breadcrumb">
          <Link href="/">
            Home
          </Link>

          <span>›</span>

          <span>
            {config.name}
          </span>
        </div>

        {/* HEADING */}

        <div className="jn-category-heading">
          <div>
            <div className="jn-category-eyebrow">
              JNMULEE NEWS
            </div>

            <h1 className="jn-category-title">
              {config.name}
            </h1>

            <p className="jn-category-description">
              {config.slug === "news"
                ? "The latest stories, breaking news and important updates from JNMulee News."
                : `The latest ${config.name.toLowerCase()} news, stories, reports and updates from JNMulee News.`}
            </p>
          </div>

          <div className="jn-category-count">
            {stories.length.toLocaleString()}{" "}
            {stories.length === 1
              ? "story"
              : "stories"}
          </div>
        </div>

        {/* FEATURED */}

        {featured ? (
          <section
            className="jn-category-featured-layout"
            aria-label="Featured stories"
          >
            <FeaturedStory
              story={featured}
            />

            <div className="jn-category-secondary">
              <div className="jn-category-secondary-header">
                <strong>
                  Latest
                </strong>

                <Link href="/">
                  View all →
                </Link>
              </div>

              <div className="jn-category-secondary-list">
                {secondary.map(
                  (story) => (
                    <CompactStory
                      key={story.id}
                      story={story}
                    />
                  )
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="jn-category-empty">
            <div className="jn-category-empty-icon">
              !
            </div>

            <h2>
              No stories yet
            </h2>

            <p>
              There are currently no
              published stories in this
              category. New stories will
              appear here automatically
              when they are published.
            </p>
          </section>
        )}

        {/* AD */}

        <div className="jn-category-ad">
          <DirectAd
            placement="home_between"
          />
        </div>

        {/* MOST READ */}

        {mostRead.length > 0 && (
          <section className="jn-category-most-read">
            <div className="jn-category-section-header">
              <div className="jn-category-section-eyebrow">
                POPULAR STORIES
              </div>

              <h2 className="jn-category-section-title">
                Most Read
              </h2>
            </div>

            <div className="jn-category-most-read-grid">
              {mostRead.map(
                (story, index) => (
                  <MostReadItem
                    key={story.id}
                    story={story}
                    number={index + 1}
                  />
                )
              )}
            </div>
          </section>
        )}

        {/* LATEST STORIES */}

        {remaining.length > 0 && (
          <>
            <div className="jn-category-latest-heading">
              <h2>
                Latest {config.name}
              </h2>

              <div className="jn-category-latest-line" />
            </div>

            <section
              className="jn-category-story-grid"
              aria-label={`Latest ${config.name} stories`}
            >
              {remaining.map(
                (story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                  />
                )
              )}
            </section>
          </>
        )}

        {/* SECOND AD */}

        <div className="jn-category-ad">
          <DirectAd
            placement="home_bottom"
          />
        </div>

        {/* MORE CATEGORIES */}

        <section className="jn-category-most-read">
          <div className="jn-category-section-header">
            <div className="jn-category-section-eyebrow">
              EXPLORE JNMULEE
            </div>

            <h2 className="jn-category-section-title">
              More Categories
            </h2>
          </div>

          <div className="jn-category-more-grid">
            {CATEGORIES.filter(
              (item) =>
                item.slug !==
                config.slug
            ).map((item) => (
              <Link
                key={item.slug}
                href={`/category/${item.slug}`}
                className="jn-category-more-card"
              >
                <div className="jn-category-more-name">
                  {item.name}
                </div>

                <div className="jn-category-more-text">
                  View latest{" "}
                  {item.name.toLowerCase()}{" "}
                  stories →
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}