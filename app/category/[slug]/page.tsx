import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news-jnnation.vercel.app";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATEGORY_NAMES: Record<string, string> = {
  news: "Top Stories",
  sport: "Sports",
  sports: "Sports",
  entertainment: "Entertainment",
  gossip: "Gossip",
  business: "Business",
  technology: "Technology",
  politics: "Politics",
  crypto: "Crypto",
  nigeria: "Nigeria",
  world: "World",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  news: "The latest top stories, breaking news and important developments.",
  sport: "Latest sports news, results, stories, transfers and updates.",
  sports: "Latest sports news, results, stories, transfers and updates.",
  entertainment:
    "Entertainment news, celebrities, movies, music and the latest showbiz stories.",
  gossip:
    "The latest celebrity gossip, trending stories and entertainment updates.",
  business:
    "Business news, markets, companies, money, economy and financial updates.",
  technology:
    "Technology news, AI, gadgets, startups, apps and the latest digital developments.",
  politics:
    "Latest political news, government updates, elections, lawmakers and public affairs.",
  crypto:
    "Cryptocurrency, blockchain, Bitcoin, Ethereum, markets and digital-asset news.",
  nigeria:
    "The latest news and developments from Nigeria and across the country.",
  world:
    "World news, international events and major developments from around the globe.",
};

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "News", href: "/category/news" },
  { label: "Nigeria", href: "/category/nigeria" },
  { label: "Politics", href: "/category/politics" },
  { label: "Sports", href: "/category/sports" },
  { label: "Entertainment", href: "/category/entertainment" },
  { label: "Business", href: "/category/business" },
  { label: "Technology", href: "/category/technology" },
  { label: "Crypto", href: "/category/crypto" },
  { label: "World", href: "/category/world" },
];

type Story = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  image_url: string | null;
  category: string | null;
  created_at: string;
  views?: number | null;
};

function cleanText(text: string | null | undefined) {
  if (!text) return "";

  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(
  text: string | null | undefined,
  length = 180
) {
  const cleaned = cleanText(text);

  if (!cleaned) return "";

  if (cleaned.length <= length) return cleaned;

  const shortened = cleaned.slice(0, length);
  const lastSpace = shortened.lastIndexOf(" ");

  return `${shortened.slice(
    0,
    lastSpace > 80 ? lastSpace : length
  )}...`;
}

function dateText(date: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "";
  }
}

function timeAgo(date: string) {
  const timestamp = new Date(date).getTime();

  if (!Number.isFinite(timestamp)) return "";

  const diff = Date.now() - timestamp;

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";

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

  return dateText(date);
}

function imageUrl(url: string | null) {
  if (!url) return null;

  return `/api/image?url=${encodeURIComponent(url)}`;
}

function getCategoryDescription(
  slug: string,
  categoryName: string
) {
  return (
    CATEGORY_DESCRIPTIONS[slug.toLowerCase()] ||
    `Latest ${categoryName.toLowerCase()} news, stories and updates from JNMulee News.`
  );
}

function StoryImage({
  url,
  title,
  priority = false,
}: {
  url: string | null;
  title: string;
  priority?: boolean;
}) {
  if (!url) {
    return (
      <div className="story-image story-image-placeholder">
        <span>JNMulee News</span>
      </div>
    );
  }

  return (
    <div className="story-image">
      <img
        src={imageUrl(url) || ""}
        alt={title}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </div>
  );
}

function LeadStory({ story }: { story: Story }) {
  return (
    <article className="lead-story">
      <Link href={`/news/${story.slug}`}>
        <StoryImage
          url={story.image_url}
          title={story.title}
          priority
        />

        <div className="lead-story-body">
          <div className="story-label">
            <span className="label-dot" />
            {story.category || "News"}
          </div>

          <h2>{story.title}</h2>

          <p>{excerpt(story.content, 260)}</p>

          <div className="story-meta">
            <span>{timeAgo(story.created_at)}</span>
            <span>•</span>
            <span>Read more</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function StoryCard({
  story,
  compact = false,
}: {
  story: Story;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <article className="compact-card">
        <Link href={`/news/${story.slug}`}>
          <div className="compact-image">
            <StoryImage
              url={story.image_url}
              title={story.title}
            />
          </div>

          <div className="compact-body">
            <span className="small-category">
              {story.category || "News"}
            </span>

            <h3>{story.title}</h3>

            <div className="small-meta">
              {timeAgo(story.created_at)}
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="story-card">
      <Link href={`/news/${story.slug}`}>
        <StoryImage
          url={story.image_url}
          title={story.title}
        />

        <div className="story-card-body">
          <span className="small-category">
            {story.category || "News"}
          </span>

          <h3>{story.title}</h3>

          <p>{excerpt(story.content, 180)}</p>

          <div className="small-meta">
            {timeAgo(story.created_at)}
          </div>
        </div>
      </Link>
    </article>
  );
}

function SectionTitle({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <span className="section-accent" />
        <h2>{title}</h2>
      </div>

      {href && (
        <Link href={href} className="view-all">
          View all →
        </Link>
      )}
    </div>
  );
}

function AdPlaceholder({
  label,
}: {
  label: string;
}) {
  return (
    <div className="ad-box">
      <span>{label}</span>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const normalizedSlug = slug.toLowerCase();

  const categoryName =
    CATEGORY_NAMES[normalizedSlug] || slug;

  const description = getCategoryDescription(
    normalizedSlug,
    categoryName
  );

  const canonicalUrl = `${siteUrl}/category/${encodeURIComponent(
    normalizedSlug
  )}`;

  return {
    title: `${categoryName} News`,
    description,
    keywords: [
      categoryName,
      `${categoryName} news`,
      `latest ${categoryName} news`,
      `breaking ${categoryName} news`,
      "JNMulee News",
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `${categoryName} News | JNMulee News`,
      description,
      url: canonicalUrl,
      siteName: "JNMulee News",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${categoryName} News | JNMulee News`,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const normalizedSlug = slug.toLowerCase();

  const categoryName =
    CATEGORY_NAMES[normalizedSlug] || slug;

  const description = getCategoryDescription(
    normalizedSlug,
    categoryName
  );

  const [
    storiesResult,
    mostReadResult,
    latestResult,
  ] = await Promise.all([
    supabase
      .from("news")
      .select(
        "id,title,slug,content,image_url,category,created_at"
      )
      .eq("Published", true)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .eq("category", categoryName)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("news")
      .select(
        "id,title,slug,content,image_url,category,created_at,views"
      )
      .eq("Published", true)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .order("views", { ascending: false, nullsFirst: false })
      .limit(8),

    supabase
      .from("news")
      .select(
        "id,title,slug,content,image_url,category,created_at"
      )
      .eq("Published", true)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const stories = (storiesResult.data || []) as Story[];
  const mostRead = (mostReadResult.data || []) as Story[];
  const latest = (latestResult.data || []) as Story[];

  const error =
    storiesResult.error ||
    mostReadResult.error ||
    latestResult.error;

  const leadStory = stories[0] || null;
  const secondaryStories = stories.slice(1, 5);
  const gridStories = stories.slice(5);

  const trendingStories = latest.slice(0, 5);

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #f4f5f7;
          color: #111827;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .jnm-page {
          min-height: 100vh;
        }

        /* HEADER */

        .jnm-header {
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          background: #b00020;
          color: #fff;
          box-shadow: 0 3px 16px rgba(0, 0, 0, 0.18);
        }

        .jnm-header-inner {
          max-width: 1280px;
          margin: 0 auto;
          min-height: 68px;
          padding: 0 22px;
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .jnm-logo {
          flex: 0 0 auto;
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -0.8px;
          white-space: nowrap;
        }

        .jnm-nav {
          min-width: 0;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 21px;
          overflow-x: auto;
          white-space: nowrap;
          scrollbar-width: none;
        }

        .jnm-nav::-webkit-scrollbar {
          display: none;
        }

        .jnm-nav a {
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          opacity: 0.96;
          transition: opacity 0.2s ease;
        }

        .jnm-nav a:hover {
          opacity: 0.7;
        }

        /* BREAKING BAR */

        .breaking-bar {
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
        }

        .breaking-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 22px;
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 13px;
          overflow: hidden;
        }

        .breaking-label {
          flex: 0 0 auto;
          background: #b00020;
          color: #fff;
          padding: 5px 9px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .breaking-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #374151;
          font-size: 13px;
          font-weight: 600;
        }

        /* PAGE */

        .jnm-container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 32px 22px 70px;
        }

        .category-heading {
          margin-bottom: 25px;
        }

        .category-heading-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .category-heading h1 {
          margin: 0;
          color: #111827;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -1.4px;
        }

        .category-description {
          max-width: 750px;
          margin: 10px 0 0;
          color: #687180;
          font-size: 16px;
          line-height: 1.6;
        }

        .category-line {
          width: 76px;
          height: 5px;
          margin-top: 15px;
          background: #b00020;
          border-radius: 10px;
        }

        /* AD */

        .ad-box {
          min-height: 92px;
          margin: 24px 0;
          border: 1px dashed #d1d5db;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.2px;
        }

        /* TOP GRID */

        .top-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.75fr) minmax(310px, 1fr);
          gap: 24px;
          align-items: stretch;
        }

        .lead-story {
          min-width: 0;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 3px 14px rgba(0, 0, 0, 0.06);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .lead-story:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .story-image {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #e5e7eb;
        }

        .story-image img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.35s ease;
        }

        .lead-story:hover .story-image img,
        .story-card:hover .story-image img,
        .compact-card:hover .story-image img {
          transform: scale(1.035);
        }

        .story-image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-weight: 800;
          font-size: 15px;
        }

        .lead-story-body {
          padding: 22px 24px 23px;
        }

        .story-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #b00020;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .label-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #b00020;
        }

        .lead-story h2 {
          margin: 9px 0 10px;
          font-size: clamp(25px, 3vw, 37px);
          line-height: 1.13;
          letter-spacing: -0.8px;
          font-weight: 900;
        }

        .lead-story p {
          margin: 0;
          color: #5d6674;
          font-size: 16px;
          line-height: 1.65;
        }

        .story-meta,
        .small-meta {
          margin-top: 14px;
          color: #8a929d;
          font-size: 12px;
          font-weight: 600;
        }

        .story-meta {
          display: flex;
          gap: 7px;
        }

        /* SECONDARY */

        .secondary-panel {
          min-width: 0;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 3px 14px rgba(0, 0, 0, 0.05);
        }

        .secondary-heading {
          padding: 17px 18px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 17px;
          font-weight: 900;
        }

        .secondary-heading::before {
          content: "";
          width: 4px;
          height: 20px;
          border-radius: 4px;
          background: #b00020;
        }

        .secondary-item {
          padding: 14px 16px;
          border-bottom: 1px solid #edf0f2;
        }

        .secondary-item:last-child {
          border-bottom: 0;
        }

        .secondary-item a {
          display: grid;
          grid-template-columns: 108px minmax(0, 1fr);
          gap: 13px;
          align-items: center;
        }

        .secondary-image {
          width: 108px;
          height: 76px;
          overflow: hidden;
          border-radius: 7px;
          background: #e5e7eb;
        }

        .secondary-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .secondary-item h3 {
          margin: 4px 0 0;
          font-size: 15px;
          line-height: 1.32;
          font-weight: 800;
        }

        .secondary-time {
          color: #8b929d;
          font-size: 11px;
          margin-top: 7px;
        }

        /* SECTION */

        .section {
          margin-top: 38px;
        }

        .section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .section-title > div {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-accent {
          width: 5px;
          height: 26px;
          background: #b00020;
          border-radius: 4px;
        }

        .section-title h2 {
          margin: 0;
          font-size: 25px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.4px;
        }

        .view-all {
          color: #b00020;
          font-size: 13px;
          font-weight: 800;
        }

        /* TRENDING */

        .trending-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
        }

        .trending-item {
          min-width: 0;
          position: relative;
          background: #111827;
          color: #fff;
          border-radius: 9px;
          overflow: hidden;
          min-height: 145px;
        }

        .trending-item img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.58;
          transition: transform 0.3s ease;
        }

        .trending-item:hover img {
          transform: scale(1.05);
        }

        .trending-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 13px;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.88),
            rgba(0, 0, 0, 0.04)
          );
        }

        .trending-number {
          color: #fff;
          opacity: 0.8;
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .trending-item h3 {
          margin: 0;
          font-size: 14px;
          line-height: 1.3;
          font-weight: 800;
        }

        /* CONTENT LAYOUT */

        .content-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 30px;
          align-items: start;
        }

        .story-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
        }

        .story-card {
          min-width: 0;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.045);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .story-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 9px 22px rgba(0, 0, 0, 0.1);
        }

        .story-card-body {
          padding: 16px 17px 17px;
        }

        .small-category {
          display: inline-block;
          color: #b00020;
          font-size: 11px;
          line-height: 1;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .story-card h3 {
          margin: 8px 0 7px;
          font-size: 20px;
          line-height: 1.28;
          font-weight: 850;
        }

        .story-card p {
          margin: 0;
          color: #66707d;
          font-size: 14px;
          line-height: 1.55;
        }

        /* SIDEBAR */

        .sidebar {
          min-width: 0;
        }

        .sidebar-box {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.045);
        }

        .sidebar-heading {
          padding: 16px 17px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 17px;
          font-weight: 900;
        }

        .sidebar-heading::before {
          content: "";
          width: 4px;
          height: 19px;
          background: #b00020;
          border-radius: 3px;
        }

        .compact-card {
          border-bottom: 1px solid #edf0f2;
          padding: 13px;
        }

        .compact-card:last-child {
          border-bottom: 0;
        }

        .compact-card a {
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          gap: 12px;
        }

        .compact-image {
          width: 92px;
          height: 72px;
          border-radius: 7px;
          overflow: hidden;
          background: #e5e7eb;
        }

        .compact-image .story-image {
          height: 100%;
          aspect-ratio: auto;
        }

        .compact-body {
          min-width: 0;
        }

        .compact-body h3 {
          margin: 5px 0 0;
          font-size: 14px;
          line-height: 1.34;
          font-weight: 800;
        }

        .sidebar-ad {
          margin-top: 20px;
        }

        /* EMPTY */

        .empty-state {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 65px 25px;
          text-align: center;
        }

        .empty-state h2 {
          margin: 0 0 9px;
          font-size: 25px;
        }

        .empty-state p {
          margin: 0;
          color: #6b7280;
          line-height: 1.6;
        }

        /* FOOTER */

        .jnm-footer {
          background: #111827;
          color: #fff;
          padding: 42px 22px;
        }

        .jnm-footer-inner {
          max-width: 1280px;
          margin: 0 auto;
        }

        .footer-brand {
          font-size: 23px;
          font-weight: 900;
          margin-bottom: 18px;
        }

        .jnm-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 21px;
          margin-bottom: 22px;
        }

        .jnm-footer-links a {
          color: #fff;
          font-size: 14px;
          font-weight: 600;
        }

        .jnm-footer-links a:hover {
          color: #fca5a5;
        }

        .jnm-footer p {
          margin: 0;
          color: #9ca3af;
          font-size: 13px;
        }

        /* MOBILE */

        @media (max-width: 1050px) {
          .jnm-nav {
            gap: 16px;
          }

          .top-grid {
            grid-template-columns: minmax(0, 1.45fr) minmax(290px, 1fr);
          }

          .trending-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 850px) {
          .jnm-header-inner {
            min-height: auto;
            padding: 14px 16px;
            align-items: flex-start;
            flex-direction: column;
            gap: 11px;
          }

          .jnm-nav {
            width: 100%;
          }

          .top-grid {
            grid-template-columns: 1fr;
          }

          .content-layout {
            grid-template-columns: 1fr;
          }

          .sidebar {
            order: 2;
          }

          .story-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .breaking-inner {
            padding: 0 14px;
          }

          .breaking-text {
            font-size: 12px;
          }

          .jnm-container {
            padding: 24px 14px 50px;
          }

          .category-heading {
            margin-bottom: 20px;
          }

          .category-heading h1 {
            font-size: 34px;
          }

          .category-description {
            font-size: 14px;
          }

          .lead-story-body {
            padding: 17px;
          }

          .lead-story h2 {
            font-size: 25px;
          }

          .lead-story p {
            font-size: 14px;
          }

          .secondary-item a {
            grid-template-columns: 92px minmax(0, 1fr);
          }

          .secondary-image {
            width: 92px;
            height: 68px;
          }

          .secondary-item h3 {
            font-size: 14px;
          }

          .trending-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .trending-item {
            min-height: 135px;
          }

          .story-grid {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .story-card h3 {
            font-size: 19px;
          }

          .section {
            margin-top: 31px;
          }

          .section-title h2 {
            font-size: 22px;
          }

          .view-all {
            font-size: 12px;
          }

          .ad-box {
            min-height: 70px;
          }

          .jnm-footer {
            padding: 32px 15px;
          }
        }

        @media (max-width: 420px) {
          .trending-grid {
            grid-template-columns: 1fr;
          }

          .trending-item {
            min-height: 155px;
          }
        }
      `}</style>

      <div className="jnm-page">
        <header className="jnm-header">
          <div className="jnm-header-inner">
            <Link href="/" className="jnm-logo">
              JNMulee News
            </Link>

            <nav className="jnm-nav" aria-label="Main navigation">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className="breaking-bar">
          <div className="breaking-inner">
            <span className="breaking-label">
              Latest
            </span>

            <span className="breaking-text">
              {leadStory?.title ||
                `Latest ${categoryName} news and updates`}
            </span>
          </div>
        </div>

        <main className="jnm-container">
          <header className="category-heading">
            <div className="category-heading-top">
              <div>
                <h1>{categoryName} News</h1>

                <div className="category-line" />

                <p className="category-description">
                  {description}
                </p>
              </div>
            </div>
          </header>

          <AdPlaceholder label="Advertisement" />

          {error ? (
            <div className="empty-state">
              <h2>Unable to load stories</h2>
              <p>
                There was a problem loading this category.
                Please try again shortly.
              </p>
            </div>
          ) : stories.length === 0 ? (
            <div className="empty-state">
              <h2>No stories yet</h2>
              <p>
                There are currently no published stories in
                this category.
              </p>
            </div>
          ) : (
            <>
              {leadStory && (
                <section className="top-grid">
                  <LeadStory story={leadStory} />

                  <aside className="secondary-panel">
                    <div className="secondary-heading">
                      Latest {categoryName}
                    </div>

                    {secondaryStories.length > 0 ? (
                      secondaryStories.map((story) => (
                        <div
                          className="secondary-item"
                          key={story.id}
                        >
                          <Link
                            href={`/news/${story.slug}`}
                          >
                            <div className="secondary-image">
                              {story.image_url ? (
                                <img
                                  src={
                                    imageUrl(
                                      story.image_url
                                    ) || ""
                                  }
                                  alt={story.title}
                                  loading="lazy"
                                />
                              ) : null}
                            </div>

                            <div>
                              <span className="small-category">
                                {story.category ||
                                  categoryName}
                              </span>

                              <h3>{story.title}</h3>

                              <div className="secondary-time">
                                {timeAgo(
                                  story.created_at
                                )}
                              </div>
                            </div>
                          </Link>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          padding: "20px",
                          color: "#6b7280",
                          fontSize: "14px",
                        }}
                      >
                        More stories coming soon.
                      </div>
                    )}
                  </aside>
                </section>
              )}

              <AdPlaceholder label="Advertisement" />

              {trendingStories.length > 0 && (
                <section className="section">
                  <SectionTitle title="Trending Now" />

                  <div className="trending-grid">
                    {trendingStories.map(
                      (story, index) => (
                        <Link
                          href={`/news/${story.slug}`}
                          className="trending-item"
                          key={story.id}
                        >
                          {story.image_url && (
                            <img
                              src={
                                imageUrl(
                                  story.image_url
                                ) || ""
                              }
                              alt={story.title}
                              loading="lazy"
                            />
                          )}

                          <div className="trending-overlay">
                            <span className="trending-number">
                              #{index + 1}
                            </span>

                            <h3>{story.title}</h3>
                          </div>
                        </Link>
                      )
                    )}
                  </div>
                </section>
              )}

              <section className="section">
                <div className="content-layout">
                  <div>
                    <SectionTitle
                      title={`Latest ${categoryName}`}
                    />

                    {gridStories.length > 0 ? (
                      <div className="story-grid">
                        {gridStories.map((story) => (
                          <StoryCard
                            key={story.id}
                            story={story}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <h2>
                          You&apos;re all caught up
                        </h2>

                        <p>
                          More stories will appear here as
                          they are published.
                        </p>
                      </div>
                    )}

                    <AdPlaceholder label="Advertisement" />
                  </div>

                  <aside className="sidebar">
                    <div className="sidebar-box">
                      <div className="sidebar-heading">
                        Most Read
                      </div>

                      {mostRead.length > 0 ? (
                        mostRead.map((story) => (
                          <StoryCard
                            key={story.id}
                            story={story}
                            compact
                          />
                        ))
                      ) : (
                        <div
                          style={{
                            padding: "20px",
                            color: "#6b7280",
                            fontSize: "14px",
                          }}
                        >
                          Most-read stories will appear
                          here.
                        </div>
                      )}
                    </div>

                    <div className="sidebar-ad">
                      <AdPlaceholder label="Advertisement" />
                    </div>
                  </aside>
                </div>
              </section>
            </>
          )}
        </main>

        <footer className="jnm-footer">
          <div className="jnm-footer-inner">
            <div className="footer-brand">
              JNMulee News
            </div>

            <div className="jnm-footer-links">
              <Link href="/">Home</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/privacy">
                Privacy Policy
              </Link>
              <Link href="/terms">Terms</Link>
            </div>

            <p>
              © {new Date().getFullYear()} JNMulee News.
              All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}