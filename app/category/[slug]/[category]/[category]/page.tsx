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
  news: "News",
  "top-stories": "Top Stories",
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
  news: "The latest news, breaking stories and important developments.",
  "top-stories":
    "The latest top stories, breaking news and important developments.",
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
  view_count?: number | null;
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

function excerpt(text: string | null | undefined, length = 180) {
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

function timeAgo(date: string) {
  const timestamp = new Date(date).getTime();

  if (!Number.isFinite(timestamp)) return "";

  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days}d ago`;

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

function imageUrl(url: string | null) {
  if (!url) return null;

  return `/api/image?url=${encodeURIComponent(url)}`;
}

function getDescription(slug: string, name: string) {
  return (
    CATEGORY_DESCRIPTIONS[slug] ||
    `Latest ${name.toLowerCase()} news, stories and updates from JNMulee News.`
  );
}

function StoryImage({
  url,
  title,
}: {
  url: string | null;
  title: string;
}) {
  if (!url) {
    return (
      <div className="placeholder">
        JNMulee News
      </div>
    );
  }

  return (
    <img
      src={imageUrl(url) || ""}
      alt={title}
      loading="lazy"
    />
  );
}

function StoryCard({ story }: { story: Story }) {
  return (
    <article className="card">
      <Link href={`/news/${story.slug}`}>
        <div className="card-image">
          <StoryImage
            url={story.image_url}
            title={story.title}
          />
        </div>

        <div className="card-body">
          <span className="category">
            {story.category || "News"}
          </span>

          <h2>{story.title}</h2>

          <p>{excerpt(story.content, 180)}</p>

          <span className="time">
            {timeAgo(story.created_at)}
          </span>
        </div>
      </Link>
    </article>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;

  const slug = decodeURIComponent(category)
    .trim()
    .toLowerCase();

  const name =
    CATEGORY_NAMES[slug] ||
    slug.replace(/-/g, " ");

  const description = getDescription(slug, name);

  const canonical = `${siteUrl}/category/${encodeURIComponent(
    slug
  )}`;

  return {
    title: `${name} News`,
    description,

    keywords: [
      name,
      `${name} news`,
      `latest ${name} news`,
      `breaking ${name} news`,
      "JNMulee News",
    ],

    alternates: {
      canonical,
    },

    robots: {
      index: true,
      follow: true,
    },

    openGraph: {
      title: `${name} News | JNMulee News`,
      description,
      url: canonical,
      siteName: "JNMulee News",
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      title: `${name} News | JNMulee News`,
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

  const slug = decodeURIComponent(category)
    .trim()
    .toLowerCase();

  const categoryName =
    CATEGORY_NAMES[slug] ||
    slug.replace(/-/g, " ");

  const description = getDescription(
    slug,
    categoryName
  );

  const { data: stories, error } = await supabase
    .from("news")
    .select(
      "id,title,slug,content,image_url,category,created_at,view_count"
    )
    .eq("Published", true)
    .eq("category", categoryName)
    .not("image_url", "is", null)
    .neq("image_url", "")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: mostRead } = await supabase
    .from("news")
    .select(
      "id,title,slug,content,image_url,category,created_at,view_count"
    )
    .eq("Published", true)
    .not("image_url", "is", null)
    .neq("image_url", "")
    .order("view_count", {
      ascending: false,
      nullsFirst: false,
    })
    .limit(8);

  const safeStories = (stories || []) as Story[];
  const safeMostRead = (mostRead || []) as Story[];

  const lead = safeStories[0];
  const secondary = safeStories.slice(1, 5);
  const remaining = safeStories.slice(5);

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f4f5f7;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #b00020;
          color: white;
          box-shadow: 0 3px 15px rgba(0,0,0,.18);
        }

        .header-inner {
          max-width: 1280px;
          min-height: 68px;
          margin: auto;
          padding: 0 22px;
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .logo {
          font-size: 25px;
          font-weight: 900;
          white-space: nowrap;
        }

        .nav {
          display: flex;
          gap: 20px;
          overflow-x: auto;
          white-space: nowrap;
          scrollbar-width: none;
        }

        .nav::-webkit-scrollbar {
          display: none;
        }

        .nav a {
          font-size: 14px;
          font-weight: 700;
        }

        .breaking {
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }

        .breaking-inner {
          max-width: 1280px;
          min-height: 42px;
          margin: auto;
          padding: 0 22px;
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
        }

        .breaking-label {
          flex: 0 0 auto;
          background: #b00020;
          color: white;
          padding: 5px 9px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .breaking-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .container {
          max-width: 1280px;
          margin: auto;
          padding: 32px 22px 70px;
        }

        .heading h1 {
          margin: 0;
          font-size: clamp(32px, 4vw, 48px);
          font-weight: 900;
          letter-spacing: -1.5px;
          text-transform: capitalize;
        }

        .line {
          width: 76px;
          height: 5px;
          margin-top: 15px;
          background: #b00020;
          border-radius: 10px;
        }

        .description {
          max-width: 760px;
          margin: 10px 0 0;
          color: #687180;
          font-size: 16px;
          line-height: 1.6;
        }

        .ad {
          min-height: 90px;
          margin: 24px 0;
          border: 1px dashed #d1d5db;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .top {
          display: grid;
          grid-template-columns: 1.7fr 1fr;
          gap: 24px;
        }

        .lead,
        .panel,
        .card,
        .most-read {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 3px 14px rgba(0,0,0,.05);
        }

        .lead-image {
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #e5e7eb;
        }

        .lead-image img,
        .card-image img,
        .secondary-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .lead-body {
          padding: 22px;
        }

        .category {
          color: #b00020;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .6px;
        }

        .lead h2 {
          margin: 9px 0;
          font-size: clamp(25px, 3vw, 38px);
          line-height: 1.12;
        }

        .lead p,
        .card p {
          color: #626b78;
          line-height: 1.6;
        }

        .time {
          display: block;
          margin-top: 12px;
          color: #8b929d;
          font-size: 12px;
          font-weight: 600;
        }

        .panel-title,
        .most-title {
          padding: 17px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 17px;
          font-weight: 900;
        }

        .secondary {
          padding: 14px 16px;
          border-bottom: 1px solid #edf0f2;
        }

        .secondary:last-child {
          border-bottom: 0;
        }

        .secondary a {
          display: grid;
          grid-template-columns: 105px 1fr;
          gap: 13px;
        }

        .secondary-image {
          width: 105px;
          height: 75px;
          overflow: hidden;
          border-radius: 7px;
          background: #e5e7eb;
        }

        .secondary h3 {
          margin: 5px 0 0;
          font-size: 14px;
          line-height: 1.35;
        }

        .section {
          margin-top: 38px;
        }

        .section-heading {
          margin-bottom: 18px;
          font-size: 25px;
          font-weight: 900;
          border-left: 5px solid #b00020;
          padding-left: 10px;
        }

        .layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 30px;
          align-items: start;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 22px;
        }

        .card-image {
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #e5e7eb;
        }

        .card-body {
          padding: 16px 17px 18px;
        }

        .card h2 {
          margin: 8px 0;
          font-size: 20px;
          line-height: 1.28;
        }

        .card p {
          margin: 0;
          font-size: 14px;
        }

        .most-item {
          padding: 13px;
          border-bottom: 1px solid #edf0f2;
        }

        .most-item:last-child {
          border-bottom: 0;
        }

        .most-item a {
          display: grid;
          grid-template-columns: 90px 1fr;
          gap: 12px;
        }

        .most-image {
          width: 90px;
          height: 70px;
          overflow: hidden;
          border-radius: 7px;
          background: #e5e7eb;
        }

        .most-item h3 {
          margin: 5px 0 0;
          font-size: 14px;
          line-height: 1.35;
        }

        .placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-weight: 800;
        }

        .empty {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 60px 25px;
          text-align: center;
        }

        .empty h2 {
          margin: 0 0 10px;
        }

        .empty p {
          margin: 0;
          color: #6b7280;
        }

        .footer {
          background: #111827;
          color: white;
          padding: 40px 22px;
        }

        .footer-inner {
          max-width: 1280px;
          margin: auto;
        }

        .footer-brand {
          font-size: 23px;
          font-weight: 900;
          margin-bottom: 18px;
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 20px;
        }

        .footer-links a {
          font-size: 14px;
        }

        .footer p {
          margin: 0;
          color: #9ca3af;
          font-size: 13px;
        }

        @media (max-width: 850px) {
          .header-inner {
            min-height: auto;
            padding: 14px 16px;
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .nav {
            width: 100%;
          }

          .top,
          .layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .container {
            padding: 24px 14px 50px;
          }

          .breaking-inner {
            padding: 0 14px;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .lead-body {
            padding: 17px;
          }

          .lead h2 {
            font-size: 25px;
          }

          .description {
            font-size: 14px;
          }

          .ad {
            min-height: 70px;
          }
        }
      `}</style>

      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo">
            JNMulee News
          </Link>

          <nav className="nav">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="breaking">
        <div className="breaking-inner">
          <span className="breaking-label">
            Latest
          </span>

          <span className="breaking-title">
            {lead?.title ||
              `Latest ${categoryName} news and updates`}
          </span>
        </div>
      </div>

      <main className="container">
        <header className="heading">
          <h1>{categoryName} News</h1>

          <div className="line" />

          <p className="description">
            {description}
          </p>
        </header>

        <div className="ad">
          Advertisement
        </div>

        {error ? (
          <div className="empty">
            <h2>Unable to load stories</h2>
            <p>
              There was a problem loading this
              category. Please try again shortly.
            </p>
          </div>
        ) : safeStories.length === 0 ? (
          <div className="empty">
            <h2>No stories yet</h2>
            <p>
              There are currently no published
              stories in this category.
            </p>
          </div>
        ) : (
          <>
            <section className="top">
              {lead && (
                <article className="lead">
                  <Link href={`/news/${lead.slug}`}>
                    <div className="lead-image">
                      <StoryImage
                        url={lead.image_url}
                        title={lead.title}
                      />
                    </div>

                    <div className="lead-body">
                      <span className="category">
                        {lead.category ||
                          categoryName}
                      </span>

                      <h2>{lead.title}</h2>

                      <p>
                        {excerpt(lead.content, 260)}
                      </p>

                      <span className="time">
                        {timeAgo(lead.created_at)}
                      </span>
                    </div>
                  </Link>
                </article>
              )}

              <aside className="panel">
                <div className="panel-title">
                  Latest {categoryName}
                </div>

                {secondary.map((story) => (
                  <div
                    className="secondary"
                    key={story.id}
                  >
                    <Link
                      href={`/news/${story.slug}`}
                    >
                      <div className="secondary-image">
                        <StoryImage
                          url={story.image_url}
                          title={story.title}
                        />
                      </div>

                      <div>
                        <span className="category">
                          {story.category ||
                            categoryName}
                        </span>

                        <h3>{story.title}</h3>

                        <span className="time">
                          {timeAgo(
                            story.created_at
                          )}
                        </span>
                      </div>
                    </Link>
                  </div>
                ))}
              </aside>
            </section>

            <div className="ad">
              Advertisement
            </div>

            <section className="section">
              <div className="layout">
                <div>
                  <h2 className="section-heading">
                    Latest {categoryName}
                  </h2>

                  {remaining.length > 0 ? (
                    <div className="grid">
                      {remaining.map((story) => (
                        <StoryCard
                          key={story.id}
                          story={story}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty">
                      <h2>
                        You&apos;re all caught up
                      </h2>

                      <p>
                        More stories will appear
                        here as they are published.
                      </p>
                    </div>
                  )}
                </div>

                <aside className="most-read">
                  <div className="most-title">
                    Most Read
                  </div>

                  {safeMostRead.length > 0 ? (
                    safeMostRead.map((story) => (
                      <div
                        className="most-item"
                        key={story.id}
                      >
                        <Link
                          href={`/news/${story.slug}`}
                        >
                          <div className="most-image">
                            <StoryImage
                              url={story.image_url}
                              title={story.title}
                            />
                          </div>

                          <div>
                            <span className="category">
                              {story.category ||
                                "News"}
                            </span>

                            <h3>
                              {story.title}
                            </h3>
                          </div>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        padding: "20px",
                        color: "#6b7280",
                      }}
                    >
                      Most-read stories will
                      appear here.
                    </div>
                  )}
                </aside>
              </div>
            </section>

            <div className="ad">
              Advertisement
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            JNMulee News
          </div>

          <div className="footer-links">
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
    </>
  );
}