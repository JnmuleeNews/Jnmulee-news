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

function getCategoryBySlug(slug: string): CategoryConfig | null {
  const normalized = slug.trim().toLowerCase();

  const actualSlug =
    normalized === "sport" ? "sports" : normalized;

  return (
    CATEGORIES.find(
      (category) => category.slug === actualSlug
    ) || null
  );
}

function cleanText(content: string | null): string {
  if (!content) return "";

  return content
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
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

function formatDate(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function timeAgo(value: string | null): string {
  if (!value) return "";

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000)
  );

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);

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

  return formatDate(value);
}

function validImage(value: string | null): boolean {
  if (!value) return false;

  return /^https?:\/\//i.test(value);
}

function categoryHref(category: string | null): string {
  if (!category) return "/category/news";

  const normalized = category.trim().toLowerCase();

  const found = CATEGORIES.find(
    (item) =>
      item.name.toLowerCase() === normalized ||
      item.slug === normalized
  );

  if (!found) return "/category/news";

  return `/category/${found.slug}`;
}

function StoryCard({ story }: { story: Story }) {
  const hasImage = validImage(story.image_url);

  return (
    <article className="storyCard">
      <Link
        href={`/news/${story.slug}`}
        className="storyLink"
      >
        {hasImage ? (
          <div className="storyImage">
            <Image
              src={story.image_url!}
              alt={story.title || "JNMulee News story"}
              fill
              sizes="(max-width: 650px) 100vw, (max-width: 1000px) 50vw, 33vw"
              className="storyImageElement"
            />
          </div>
        ) : (
          <div className="imagePlaceholder">
            JNMulee News
          </div>
        )}

        <div className="storyBody">
          <div className="storyCategory">
            {story.category || "News"}
          </div>

          <h2 className="storyTitle">
            {story.title || "Untitled Story"}
          </h2>

          <p className="storyExcerpt">
            {getExcerpt(story.content)}
          </p>

          <div className="storyMeta">
            <time dateTime={story.created_at || undefined}>
              {timeAgo(story.created_at)}
            </time>

            <span>•</span>

            <span>
              {formatDate(story.created_at)}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function FeaturedStory({ story }: { story: Story }) {
  const hasImage = validImage(story.image_url);

  return (
    <article className="featuredStory">
      <Link
        href={`/news/${story.slug}`}
        className="featuredLink"
      >
        {hasImage ? (
          <div className="featuredImage">
            <Image
              src={story.image_url!}
              alt={story.title || "JNMulee News"}
              fill
              priority
              sizes="(max-width: 800px) 100vw, 66vw"
              className="featuredImageElement"
            />
          </div>
        ) : (
          <div className="featuredPlaceholder">
            JNMulee News
          </div>
        )}

        <div className="featuredBody">
          <div className="featuredCategory">
            {story.category || "News"}
          </div>

          <h2 className="featuredTitle">
            {story.title || "Latest News"}
          </h2>

          <p className="featuredExcerpt">
            {getExcerpt(story.content, 260)}
          </p>

          <div className="featuredMeta">
            {timeAgo(story.created_at)}
          </div>
        </div>
      </Link>
    </article>
  );
}

function CompactStory({ story }: { story: Story }) {
  const hasImage = validImage(story.image_url);

  return (
    <Link
      href={`/news/${story.slug}`}
      className="compactStory"
    >
      {hasImage ? (
        <div className="compactImage">
          <Image
            src={story.image_url!}
            alt={story.title || "JNMulee News"}
            fill
            sizes="90px"
            className="compactImageElement"
          />
        </div>
      ) : (
        <div className="compactPlaceholder">
          News
        </div>
      )}

      <div className="compactBody">
        <div className="compactCategory">
          {story.category || "News"}
        </div>

        <div className="compactTitle">
          {story.title || "Latest News"}
        </div>

        <div className="compactDate">
          {timeAgo(story.created_at)}
        </div>
      </div>
    </Link>
  );
}

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
      className="mostReadItem"
    >
      <div className="mostReadNumber">
        {String(number).padStart(2, "0")}
      </div>

      <div className="mostReadContent">
        <div className="mostReadCategory">
          {story.category || "News"}
        </div>

        <div className="mostReadTitle">
          {story.title || "Latest News"}
        </div>

        <div className="mostReadViews">
          {Number(
            story.view_count || 0
          ).toLocaleString()}{" "}
          views
        </div>
      </div>
    </Link>
  );
}

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({
    category: category.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;

  const config = getCategoryBySlug(category);

  if (!config) {
    return {
      title: "Category Not Found | JNMulee News",
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
    metadataBase: new URL(SITE_URL),

    title,

    description,

    alternates: {
      canonical: `${SITE_URL}/category/${config.slug}`,
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
      url: `${SITE_URL}/category/${config.slug}`,
      siteName: "JNMulee News",
    },

    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  const config = getCategoryBySlug(category);

  if (!config) {
    notFound();
  }

  const storySelect =
    "id,title,slug,content,image_url,category,created_at,view_count";

  let query = supabase
    .from("news")
    .select(storySelect)
    .eq("Published", true)
    .not("image_url", "is", null)
    .neq("image_url", "")
    .not("slug", "is", null);

  if (config.slug !== "news") {
    query = query.eq("category", config.name);
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

  const stories = (data || []) as Story[];

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

  const featured = stories[0] || null;
  const secondary = stories.slice(1, 5);
  const remaining = stories.slice(5);

  return (
    <main className="categoryPage">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .categoryPage {
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
          z-index: 100;
          background: #c8102e;
          color: #ffffff;
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
          color: #ffffff;
          text-decoration: none;
          font-size: 25px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -.9px;
          white-space: nowrap;
        }

        .logo span {
          font-weight: 500;
          opacity: .92;
        }

        .headerSearch {
          width: min(390px, 100%);
        }

        .headerSearch form {
          width: 100%;
        }

        .headerSearch input {
          width: 100%;
          height: 40px;
          border: 0;
          border-radius: 999px;
          padding: 0 18px;
          outline: none;
          background: #ffffff;
          color: #111827;
          font-size: 14px;
        }

        .categoryNav {
          background: #a90d27;
          border-top: 1px solid rgba(255,255,255,.14);
          overflow-x: auto;
          scrollbar-width: none;
        }

        .categoryNav::-webkit-scrollbar {
          display: none;
        }

        .categoryNavInner {
          display: flex;
          align-items: center;
          min-height: 43px;
          white-space: nowrap;
        }

        .categoryNavLink {
          color: rgba(255,255,255,.96);
          text-decoration: none;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 800;
        }

        .categoryNavLink:hover {
          background: rgba(255,255,255,.12);
        }

        .categoryNavLink.active {
          background: rgba(255,255,255,.18);
        }

        .breakingBar {
          background: #111827;
          color: #ffffff;
        }

        .breakingInner {
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
        }

        .breakingLabel {
          flex: 0 0 auto;
          background: #c8102e;
          border-radius: 4px;
          padding: 5px 9px;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .6px;
        }

        .breakingLive {
          flex: 0 0 auto;
          color: #ff617b;
          font-size: 11px;
          font-weight: 900;
        }

        .breakingTitle {
          min-width: 0;
          overflow: hidden;
          color: #ffffff;
          text-decoration: none;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 650;
        }

        .breakingTitle:hover {
          text-decoration: underline;
        }

        .main {
          padding-top: 32px;
          padding-bottom: 70px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 18px;
          color: #6b7280;
          font-size: 13px;
        }

        .breadcrumb a {
          color: #c8102e;
          text-decoration: none;
          font-weight: 800;
        }

        .categoryHeading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 25px;
          margin-bottom: 25px;
        }

        .headingEyebrow {
          margin-bottom: 7px;
          color: #c8102e;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 1.2px;
          text-transform: uppercase;
        }

        .categoryTitle {
          margin: 0;
          color: #111827;
          font-size: clamp(34px, 5vw, 52px);
          line-height: 1;
          letter-spacing: -2px;
          font-weight: 950;
        }

        .categoryDescription {
          max-width: 650px;
          margin: 11px 0 0;
          color: #687284;
          font-size: 15px;
          line-height: 1.65;
        }

        .storyCount {
          flex: 0 0 auto;
          color: #6b7280;
          font-size: 13px;
          font-weight: 700;
        }

        .featuredLayout {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(300px, .75fr);
          gap: 25px;
          margin-bottom: 35px;
        }

        .featuredStory {
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 17px;
          background: #ffffff;
          box-shadow: 0 8px 28px rgba(15,23,42,.06);
        }

        .featuredLink {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .featuredImage {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #e5e7eb;
        }

        .featuredImageElement {
          object-fit: cover;
          transition: transform .35s ease;
        }

        .featuredStory:hover .featuredImageElement {
          transform: scale(1.035);
        }

        .featuredPlaceholder {
          min-height: 360px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #d7193f, #790d28);
          color: #ffffff;
          font-size: 18px;
          font-weight: 950;
        }

        .featuredBody {
          padding: 23px 25px 26px;
          border-top: 4px solid #c8102e;
        }

        .featuredCategory {
          margin-bottom: 9px;
          color: #c8102e;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .8px;
          text-transform: uppercase;
        }

        .featuredTitle {
          margin: 0;
          color: #111827;
          font-size: clamp(27px, 4vw, 43px);
          line-height: 1.08;
          letter-spacing: -1.3px;
          font-weight: 950;
        }

        .featuredExcerpt {
          margin: 15px 0 0;
          color: #596273;
          font-size: 16px;
          line-height: 1.65;
        }

        .featuredMeta {
          margin-top: 16px;
          color: #8a93a3;
          font-size: 12px;
          font-weight: 650;
        }

        .secondaryPanel {
          min-width: 0;
        }

        .secondaryHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 11px;
          padding-bottom: 10px;
          border-bottom: 3px solid #c8102e;
        }

        .secondaryHeader strong {
          color: #111827;
          font-size: 18px;
          font-weight: 950;
        }

        .secondaryHeader a {
          color: #c8102e;
          text-decoration: none;
          font-size: 12px;
          font-weight: 850;
        }

        .secondaryStories {
          display: grid;
          gap: 12px;
        }

        .compactStory {
          display: grid;
          grid-template-columns: 88px minmax(0,1fr);
          gap: 12px;
          min-width: 0;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
          color: inherit;
          text-decoration: none;
        }

        .compactImage,
        .compactPlaceholder {
          position: relative;
          width: 88px;
          height: 70px;
          overflow: hidden;
          border-radius: 8px;
          background: #e5e7eb;
        }

        .compactImageElement {
          object-fit: cover;
        }

        .compactPlaceholder {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8a93a3;
          font-size: 11px;
          font-weight: 800;
        }

        .compactBody {
          min-width: 0;
        }

        .compactCategory,
        .mostReadCategory,
        .storyCategory {
          color: #c8102e;
          text-transform: uppercase;
          font-weight: 950;
        }

        .compactCategory {
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 9px;
          letter-spacing: .6px;
        }

        .compactTitle {
          display: -webkit-box;
          overflow: hidden;
          color: #111827;
          font-size: 14px;
          line-height: 1.3;
          font-weight: 850;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }

        .compactDate {
          margin-top: 5px;
          color: #9299a7;
          font-size: 10px;
        }

        .compactStory:hover .compactTitle {
          color: #c8102e;
        }

        .adWrap {
          margin: 30px 0;
        }

        .mostReadSection {
          margin: 40px 0;
          padding: 24px;
          border: 1px solid #e5e7eb;
          border-top: 4px solid #c8102e;
          border-radius: 15px;
          background: #ffffff;
        }

        .sectionHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 20px;
        }

        .sectionEyebrow {
          margin-bottom: 5px;
          color: #c8102e;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .sectionTitle {
          margin: 0;
          color: #111827;
          font-size: 28px;
          line-height: 1;
          letter-spacing: -.8px;
          font-weight: 950;
        }

        .mostReadGrid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0,1fr));
          gap: 16px;
        }

        .mostReadItem {
          display: block;
          color: inherit;
          text-decoration: none;
          min-width: 0;
        }

        .mostReadNumber {
          margin-bottom: 9px;
          color: #c8102e;
          font-size: 28px;
          line-height: 1;
          font-weight: 950;
        }

        .mostReadTitle {
          display: -webkit-box;
          overflow: hidden;
          color: #111827;
          font-size: 14px;
          line-height: 1.35;
          font-weight: 850;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 4;
        }

        .mostReadViews {
          margin-top: 7px;
          color: #8a93a3;
          font-size: 10px;
        }

        .mostReadItem:hover .mostReadTitle {
          color: #c8102e;
        }

        .latestHeader {
          display: flex;
          align-items: center;
          gap: 18px;
          margin: 45px 0 20px;
        }

        .latestHeader h2 {
          flex: 0 0 auto;
          margin: 0;
          color: #111827;
          font-size: 29px;
          line-height: 1;
          font-weight: 950;
        }

        .latestLine {
          width: 100%;
          height: 3px;
          background: #c8102e;
          opacity: .28;
        }

        .storyGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 21px;
        }

        .storyCard {
          min-width: 0;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 7px 25px rgba(15,23,42,.05);
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .storyCard:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 32px rgba(15,23,42,.1);
        }

        .storyLink {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .storyImage,
        .imagePlaceholder {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #e5e7eb;
        }

        .storyImageElement {
          object-fit: cover;
          transition: transform .3s ease;
        }

        .storyCard:hover .storyImageElement {
          transform: scale(1.035);
        }

        .imagePlaceholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #d7193f, #790d28);
          color: #ffffff;
          font-size: 14px;
          font-weight: 950;
        }

        .storyBody {
          padding: 17px;
          border-top: 3px solid #c8102e;
        }

        .storyCategory {
          margin-bottom: 8px;
          font-size: 10px;
          letter-spacing: .7px;
        }

        .storyTitle {
          margin: 0;
          color: #111827;
          font-size: 19px;
          line-height: 1.27;
          font-weight: 900;
        }

        .storyExcerpt {
          margin: 10px 0 13px;
          color: #687284;
          font-size: 13px;
          line-height: 1.6;
        }

        .storyMeta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          color: #8a93a3;
          font-size: 11px;
        }

        .emptyState {
          padding: 70px 25px;
          border: 1px solid #e5e7eb;
          border-top: 4px solid #c8102e;
          border-radius: 15px;
          background: #ffffff;
          text-align: center;
        }

        .emptyStateIcon {
          width: 62px;
          height: 62px;
          margin: 0 auto 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #fef2f2;
          color: #c8102e;
          font-size: 25px;
          font-weight: 950;
        }

        .emptyState h2 {
          margin: 0 0 9px;
          color: #111827;
          font-size: 25px;
        }

        .emptyState p {
          max-width: 550px;
          margin: 0 auto;
          color: #6b7280;
          line-height: 1.65;
        }

        .footer {
          margin-top: 30px;
          padding: 35px 0;
          background: #111827;
          color: #ffffff;
        }

        .footerLinks {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 18px;
        }

        .footerLinks a {
          color: #d1d5db;
          text-decoration: none;
          font-size: 13px;
          font-weight: 650;
        }

        .footerCopyright {
          margin: 0;
          color: #9ca3af;
          font-size: 12px;
        }

        .categoryGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        @media (max-width: 1050px) {
          .featuredLayout {
            grid-template-columns: 1fr;
          }

          .secondaryStories {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .mostReadGrid {
            grid-template-columns: repeat(3, minmax(0,1fr));
          }

          .storyGrid {
            grid-template-columns: repeat(2, minmax(0,1fr));
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

          .main {
            padding-top: 23px;
          }

          .categoryHeading {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
          }

          .categoryTitle {
            font-size: 38px;
          }

          .secondaryStories {
            grid-template-columns: 1fr;
          }

          .mostReadGrid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .storyGrid {
            grid-template-columns: 1fr;
          }

          .categoryGrid {
            grid-template-columns: 1fr;
          }

          .latestHeader {
            align-items: flex-start;
            flex-direction: column;
            gap: 9px;
          }
        }

        @media (max-width: 430px) {
          .breakingLive {
            display: none;
          }

          .mostReadGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="siteHeader">
        <div className="container headerTop">
          <Link href="/" className="logo">
            JNMulee <span>News</span>
          </Link>

          <div className="headerSearch">
            <form action="/search" method="GET">
              <input
                type="search"
                name="q"
                placeholder="Search JNMulee News..."
                aria-label="Search JNMulee News"
              />
            </form>
          </div>
        </div>

        <nav
          className="categoryNav"
          aria-label="News categories"
        >
          <div className="container categoryNavInner">
            {CATEGORIES.map((item) => (
              <Link
                key={item.slug}
                href={`/category/${item.slug}`}
                className={
                  item.slug === config.slug
                    ? "categoryNavLink active"
                    : "categoryNavLink"
                }
              >
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <div className="breakingBar">
        <div className="container breakingInner">
          <span className="breakingLabel">
            BREAKING
          </span>

          <span className="breakingLive">
            ● LIVE
          </span>

          <Link
            href={
              featured
                ? `/news/${featured.slug}`
                : "/"
            }
            className="breakingTitle"
          >
            {featured?.title ||
              "Latest news and updates from JNMulee News."}
          </Link>
        </div>
      </div>

      <main className="container main">
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>
          <span>{config.name}</span>
        </div>

        <div className="categoryHeading">
          <div>
            <div className="headingEyebrow">
              JNMULEE NEWS
            </div>

            <h1 className="categoryTitle">
              {config.name}
            </h1>

            <p className="categoryDescription">
              {config.slug === "news"
                ? "The latest stories, breaking news and important updates from JNMulee News."
                : `The latest ${config.name.toLowerCase()} news, stories, reports and updates from JNMulee News.`}
            </p>
          </div>

          <div className="storyCount">
            {stories.length.toLocaleString()}{" "}
            {stories.length === 1
              ? "story"
              : "stories"}
          </div>
        </div>

        {featured ? (
          <section
            className="featuredLayout"
            aria-label="Featured stories"
          >
            <FeaturedStory story={featured} />

            <div className="secondaryPanel">
              <div className="secondaryHeader">
                <strong>Latest</strong>

                <Link href="/category/news">
                  More →
                </Link>
              </div>

              <div className="secondaryStories">
                {secondary.map((story) => (
                  <CompactStory
                    key={story.id}
                    story={story}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="emptyState">
            <div className="emptyStateIcon">
              !
            </div>

            <h2>No stories yet</h2>

            <p>
              There are currently no published
              stories in this category. New stories
              will appear here automatically when
              they are published.
            </p>
          </section>
        )}

        <div className="adWrap">
          <DirectAd placement="home_between" />
        </div>

        {mostRead.length > 0 && (
          <section className="mostReadSection">
            <div className="sectionHeader">
              <div>
                <div className="sectionEyebrow">
                  POPULAR STORIES
                </div>

                <h2 className="sectionTitle">
                  Most Read
                </h2>
              </div>
            </div>

            <div className="mostReadGrid">
              {mostRead.map((story, index) => (
                <MostReadItem
                  key={story.id}
                  story={story}
                  number={index + 1}
                />
              ))}
            </div>
          </section>
        )}

        {remaining.length > 0 && (
          <>
            <div className="latestHeader">
              <h2>
                Latest {config.name}
              </h2>

              <div className="latestLine" />
            </div>

            <section
              className="storyGrid"
              aria-label={`Latest ${config.name} stories`}
            >
              {remaining.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                />
              ))}
            </section>
          </>
        )}

        <div className="adWrap">
          <DirectAd placement="home_bottom" />
        </div>

        <section className="mostReadSection">
          <div className="sectionHeader">
            <div>
              <div className="sectionEyebrow">
                EXPLORE JNMULEE
              </div>

              <h2 className="sectionTitle">
                More Categories
              </h2>
            </div>
          </div>

          <div className="categoryGrid">
            {CATEGORIES.filter(
              (item) => item.slug !== config.slug
            ).map((item) => (
              <Link
                key={item.slug}
                href={`/category/${item.slug}`}
                className="compactStory"
                style={{
                  display: "block",
                  padding: "14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    color: "#c8102e",
                    fontSize: "15px",
                    fontWeight: 900,
                  }}
                >
                  {item.name}
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    color: "#6b7280",
                    fontSize: "12px",
                  }}
                >
                  View latest{" "}
                  {item.name.toLowerCase()} stories →
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footerLinks">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">
              Privacy Policy
            </Link>
            <Link href="/terms">Terms</Link>
            <Link href="/search">Search</Link>
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