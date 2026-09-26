import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DirectAd from "@/components/DirectAd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news-jnnation.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: "JNMulee News | Latest Nigeria & World News",

  description:
    "JNMulee News brings you the latest Nigeria, world, business, technology, sports, entertainment, politics, crypto and breaking news.",

  keywords: [
    "JNMulee News",
    "Nigeria news",
    "latest news",
    "breaking news",
    "world news",
    "politics",
    "sports",
    "technology",
    "business",
    "entertainment",
    "crypto",
  ],

  alternates: {
    canonical: siteUrl,
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

  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "JNMulee News",
    title: "JNMulee News | Latest Nigeria & World News",
    description:
      "Latest breaking news, Nigeria news, world news, politics, sports, technology, business and entertainment.",
  },

  twitter: {
    card: "summary_large_image",
    title: "JNMulee News",
    description:
      "Latest Nigeria and world news from JNMulee News.",
  },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const categories = [
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
];

type Story = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  image_url: string | null;
  category: string | null;
  created_at: string | null;
  view_count?: number | null;
};

function cleanText(content: string | null) {
  if (!content) return "";

  return content
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(content: string | null, length = 170) {
  const text = cleanText(content);

  if (!text) return "";

  return text.length > length
    ? `${text.slice(0, length).trim()}...`
    : text;
}

function timeAgo(date: string | null) {
  if (!date) return "";

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) return "";

  const seconds = Math.floor(
    (Date.now() - timestamp) / 1000
  );

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days}d ago`;

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function validImage(url: string | null) {
  if (!url) return false;

  return /^https?:\/\//i.test(url);
}

function StoryCard({
  story,
  large = false,
  showExcerpt = false,
}: {
  story: Story;
  large?: boolean;
  showExcerpt?: boolean;
}) {
  const hasImage = validImage(story.image_url);

  return (
    <article
      className={
        large
          ? "jnmulee-story-card jnmulee-story-card-large"
          : "jnmulee-story-card"
      }
    >
      <Link
        href={`/news/${story.slug}`}
        className="jnmulee-story-link"
      >
        {hasImage ? (
          <div
            className={
              large
                ? "jnmulee-image-wrap jnmulee-image-wrap-large"
                : "jnmulee-image-wrap"
            }
          >
            <Image
              src={story.image_url!}
              alt={story.title}
              fill
              priority={large}
              loading={large ? "eager" : "lazy"}
              sizes={
                large
                  ? "(max-width: 900px) 100vw, 70vw"
                  : "(max-width: 650px) 100vw, (max-width: 900px) 50vw, 33vw"
              }
              className="jnmulee-story-image"
            />

            {large && (
              <div className="jnmulee-featured-overlay">
                <span>FEATURED</span>
              </div>
            )}
          </div>
        ) : (
          <div className="jnmulee-image-placeholder">
            <div className="jnmulee-placeholder-mark">
              JN
            </div>

            <span>JNMulee News</span>
          </div>
        )}

        <div
          className={
            large
              ? "jnmulee-story-content jnmulee-story-content-large"
              : "jnmulee-story-content"
          }
        >
          <div className="jnmulee-story-category">
            {story.category || "News"}
          </div>

          <h2
            className={
              large
                ? "jnmulee-story-title jnmulee-story-title-large"
                : "jnmulee-story-title"
            }
          >
            {story.title}
          </h2>

          {(large || showExcerpt) && (
            <p className="jnmulee-story-excerpt">
              {excerpt(
                story.content,
                large ? 220 : 150
              )}
            </p>
          )}

          <div className="jnmulee-story-meta">
            <time dateTime={story.created_at || undefined}>
              {timeAgo(story.created_at)}
            </time>

            {story.view_count !== undefined &&
              story.view_count !== null && (
                <>
                  <span className="jnmulee-meta-dot">
                    •
                  </span>

                  <span>
                    {Number(
                      story.view_count
                    ).toLocaleString()}{" "}
                    views
                  </span>
                </>
              )}
          </div>
        </div>
      </Link>
    </article>
  );
}

function CompactStory({
  story,
}: {
  story: Story;
}) {
  const hasImage = validImage(story.image_url);

  return (
    <Link
      href={`/news/${story.slug}`}
      className="jnmulee-compact-story"
    >
      {hasImage ? (
        <div className="jnmulee-compact-image-wrap">
          <Image
            src={story.image_url!}
            alt={story.title}
            fill
            loading="lazy"
            sizes="86px"
            className="jnmulee-compact-image"
          />
        </div>
      ) : (
        <div className="jnmulee-compact-placeholder">
          JN
        </div>
      )}

      <div className="jnmulee-compact-body">
        <div className="jnmulee-compact-category">
          {story.category || "News"}
        </div>

        <div className="jnmulee-compact-title">
          {story.title}
        </div>

        <div className="jnmulee-compact-date">
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
  const hasImage = validImage(story.image_url);

  return (
    <Link
      href={`/news/${story.slug}`}
      className="jnmulee-most-read-item"
    >
      <strong className="jnmulee-most-read-number">
        {String(number).padStart(2, "0")}
      </strong>

      {hasImage ? (
        <div className="jnmulee-most-read-image-wrap">
          <Image
            src={story.image_url!}
            alt={story.title}
            fill
            loading="lazy"
            sizes="82px"
            className="jnmulee-most-read-image"
          />
        </div>
      ) : (
        <div className="jnmulee-most-read-placeholder">
          JN
        </div>
      )}

      <div>
        <div className="jnmulee-most-read-title">
          {story.title}
        </div>

        <div className="jnmulee-most-read-views">
          {Number(
            story.view_count || 0
          ).toLocaleString()}{" "}
          views
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({
  title,
  slug,
  eyebrow,
}: {
  title: string;
  slug?: string;
  eyebrow?: string;
}) {
  return (
    <div className="jnmulee-section-header">
      <div>
        {eyebrow && (
          <div className="jnmulee-section-eyebrow">
            <span className="jnmulee-eyebrow-line" />
            {eyebrow}
          </div>
        )}

        <h2 className="jnmulee-section-title">
          {title}
        </h2>
      </div>

      {slug && (
        <Link
          href={`/category/${slug}`}
          className="jnmulee-view-all"
        >
          View All
          <span>→</span>
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const storySelect =
    "id,title,slug,content,image_url,category,created_at,view_count";

  const [latestResult, mostReadResult] =
    await Promise.all([
      supabase
        .from("news")
        .select(storySelect)
        .eq("Published", true)
        .order("created_at", {
          ascending: false,
        })
        .limit(60),

      supabase
        .from("news")
        .select(storySelect)
        .eq("Published", true)
        .order("view_count", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        })
        .limit(10),
    ]);

  const latest =
    (latestResult.data || []) as Story[];

  const mostRead =
    (mostReadResult.data || []) as Story[];

  const featured = latest[0] || null;

  const categoryStories: Record<
    string,
    Story[]
  > = {};

  for (const category of categories) {
    if (category.slug === "news") continue;

    categoryStories[category.slug] =
      latest
        .filter(
          (story) =>
            story.category === category.name
        )
        .slice(0, 4);
  }

  const trending = latest
    .filter(
      (story) =>
        story.id !== featured?.id
    )
    .slice(0, 5);

  const secondaryHeroStories =
    latest.slice(1, 5);

  const latestGrid =
    latest.slice(5, 20);

  return (
    <>
      <header className="jnmulee-main-header">
        <div className="jnmulee-header-inner">
          <Link
            href="/"
            className="jnmulee-logo"
            aria-label="JNMulee News home"
          >
            <span className="jnmulee-logo-mark">
              JN
            </span>

            <span className="jnmulee-logo-text">
              <strong>JNMulee</strong>
              <em>News</em>
            </span>
          </Link>

          <div className="jnmulee-header-actions">
            <Link
              href="/search"
              className="jnmulee-search-button"
              aria-label="Search JNMulee News"
            >
              <span className="jnmulee-search-icon">
                ⌕
              </span>

              <span className="jnmulee-search-text">
                Search
              </span>
            </Link>
          </div>
        </div>
      </header>

      <nav
        className="jnmulee-category-nav"
        aria-label="News categories"
      >
        <div className="jnmulee-category-nav-inner">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="jnmulee-nav-link"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </nav>

      <div className="jnmulee-breaking-bar">
        <div className="jnmulee-breaking-inner">
          <span className="jnmulee-breaking-label">
            BREAKING
          </span>

          <span className="jnmulee-breaking-live">
            <i />
            LIVE
          </span>

          <Link
            href={
              featured
                ? `/news/${featured.slug}`
                : "/"
            }
            className="jnmulee-breaking-title"
          >
            {featured?.title ||
              "Latest news and updates from JNMulee News."}
          </Link>

          <span className="jnmulee-breaking-arrow">
            →
          </span>
        </div>
      </div>

      <main className="jnmulee-home">
        {featured && (
          <section className="jnmulee-hero-section">
            <div className="jnmulee-hero-grid">
              <StoryCard
                story={featured}
                large
              />

              <div className="jnmulee-hero-side">
                <div className="jnmulee-side-heading">
                  <div>
                    <span className="jnmulee-side-heading-label">
                      LIVE DESK
                    </span>

                    <strong>
                      Latest
                    </strong>
                  </div>

                  <Link href="/category/news">
                    More →
                  </Link>
                </div>

                {secondaryHeroStories.map(
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
        )}

        <div className="jnmulee-ad-wrap">
          <DirectAd placement="homepage" />
        </div>

        {trending.length > 0 && (
          <section className="jnmulee-section">
            <SectionHeader
              title="Trending Now"
              eyebrow="WHAT PEOPLE ARE READING"
            />

            <div className="jnmulee-trending-grid">
              {trending.map(
                (story, index) => (
                  <Link
                    href={`/news/${story.slug}`}
                    key={story.id}
                    className="jnmulee-trending-card"
                  >
                    <div className="jnmulee-trending-number">
                      {String(index + 1).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    <div>
                      <div className="jnmulee-trending-category">
                        {story.category ||
                          "News"}
                      </div>

                      <div className="jnmulee-trending-title">
                        {story.title}
                      </div>
                    </div>
                  </Link>
                )
              )}
            </div>
          </section>
        )}

        <section className="jnmulee-section">
          <div className="jnmulee-most-read-box">
            <SectionHeader
              title="Most Read"
              eyebrow="POPULAR STORIES"
            />

            <div className="jnmulee-most-read-grid">
              {mostRead.length > 0 ? (
                mostRead.map(
                  (story, index) => (
                    <MostReadItem
                      key={story.id}
                      story={story}
                      number={index + 1}
                    />
                  )
                )
              ) : (
                <p className="jnmulee-empty-message">
                  Popular stories will appear
                  here as readers visit the site.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="jnmulee-section">
          <SectionHeader
            title="Latest News"
            slug="news"
            eyebrow="JUST IN"
          />

          {latestGrid.length > 0 ? (
            <div className="jnmulee-news-grid">
              {latestGrid.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  showExcerpt
                />
              ))}
            </div>
          ) : (
            <div className="jnmulee-empty">
              No latest stories available yet.
            </div>
          )}
        </section>

        <div className="jnmulee-ad-wrap">
          <DirectAd placement="home_between" />
        </div>

        {categories
          .filter(
            (category) =>
              category.slug !== "news"
          )
          .map((category) => {
            const stories =
              categoryStories[
                category.slug
              ] || [];

            if (stories.length === 0) {
              return null;
            }

            return (
              <section
                key={category.slug}
                className="jnmulee-section jnmulee-category-section"
              >
                <SectionHeader
                  title={category.name}
                  slug={category.slug}
                />

                <div className="jnmulee-category-grid">
                  {stories.map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                    />
                  ))}
                </div>
              </section>
            );
          })}

        <section className="jnmulee-newsletter">
          <div className="jnmulee-newsletter-glow" />

          <div className="jnmulee-newsletter-content">
            <div className="jnmulee-newsletter-label">
              JNMULEE NEWS
            </div>

            <h2>
              Stay informed.
              <br />
              <span>Stay ahead.</span>
            </h2>

            <p>
              Follow JNMulee News for
              breaking stories, Nigeria news
              and important updates.
            </p>
          </div>

          <Link
            href="/search"
            className="jnmulee-newsletter-button"
          >
            Explore More News
            <span>→</span>
          </Link>
        </section>

        <div className="jnmulee-ad-wrap jnmulee-bottom-ad">
          <DirectAd placement="home_bottom" />
        </div>
      </main>

      <style>{`

        :root {
          --jn-navy: #0b1220;
          --jn-navy-2: #111a2e;
          --jn-blue: #2563eb;
          --jn-blue-light: #60a5fa;
          --jn-blue-soft: #eff6ff;
          --jn-white: #ffffff;
          --jn-bg: #f7f9fc;
          --jn-card: #ffffff;
          --jn-text: #111827;
          --jn-text-soft: #526071;
          --jn-muted: #7b8796;
          --jn-border: #e4e9f0;
          --jn-border-dark: #d6dde8;
          --jn-shadow: 0 8px 30px rgba(15, 23, 42, .06);
          --jn-shadow-hover: 0 16px 45px rgba(15, 23, 42, .12);
        }

        .jnmulee-main-header {
          background:
            linear-gradient(
              135deg,
              #09111f 0%,
              #0b1220 50%,
              #101b31 100%
            );
          color: #fff;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow:
            0 5px 25px rgba(3, 8, 20, .22);
          border-bottom:
            1px solid rgba(255,255,255,.08);
        }

        .jnmulee-header-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 12px 18px;
          min-height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .jnmulee-logo {
          color: #fff;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .jnmulee-logo-mark {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #60a5fa
            );
          color: #fff;
          font-size: 13px;
          font-weight: 1000;
          letter-spacing: -.5px;
          box-shadow:
            0 5px 18px rgba(37,99,235,.35);
        }

        .jnmulee-logo-text {
          display: flex;
          align-items: baseline;
          gap: 5px;
          line-height: 1;
          white-space: nowrap;
        }

        .jnmulee-logo-text strong {
          font-size:
            clamp(1.45rem, 4vw, 2rem);
          font-weight: 950;
          letter-spacing: -1.3px;
        }

        .jnmulee-logo-text em {
          font-style: normal;
          color: #60a5fa;
          font-size:
            clamp(.95rem, 2.5vw, 1.15rem);
          font-weight: 700;
          letter-spacing: -.3px;
        }

        .jnmulee-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .jnmulee-search-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: #fff;
          text-decoration: none;
          border:
            1px solid rgba(255,255,255,.17);
          background:
            rgba(255,255,255,.06);
          border-radius: 999px;
          padding: 9px 15px;
          font-size: 12px;
          font-weight: 850;
          transition:
            background .2s ease,
            border-color .2s ease,
            transform .2s ease;
        }

        .jnmulee-search-button:hover {
          background:
            rgba(255,255,255,.12);
          border-color:
            rgba(255,255,255,.3);
          transform:
            translateY(-1px);
        }

        .jnmulee-search-icon {
          font-size: 20px;
          line-height: .7;
        }

        .jnmulee-category-nav {
          background: #fff;
          border-bottom:
            1px solid var(--jn-border);
          position: relative;
          z-index: 90;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .jnmulee-category-nav::-webkit-scrollbar {
          display: none;
        }

        .jnmulee-category-nav-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 18px;
          min-height: 47px;
          display: flex;
          align-items: center;
          gap: 25px;
          white-space: nowrap;
        }

        .jnmulee-nav-link {
          position: relative;
          color: #3f4a5a;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          padding: 16px 0;
          transition:
            color .2s ease;
        }

        .jnmulee-nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 3px;
          background:
            var(--jn-blue);
          transform:
            scaleX(0);
          transform-origin:
            center;
          transition:
            transform .2s ease;
        }

        .jnmulee-nav-link:first-child,
        .jnmulee-nav-link:hover {
          color: var(--jn-blue);
        }

        .jnmulee-nav-link:hover::after,
        .jnmulee-nav-link:first-child::after {
          transform: scaleX(1);
        }

        .jnmulee-breaking-bar {
          background:
            var(--jn-navy);
          color: #fff;
          border-bottom:
            1px solid rgba(255,255,255,.05);
        }

        .jnmulee-breaking-inner {
          max-width: 1240px;
          margin: 0 auto;
          min-height: 43px;
          padding: 6px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .jnmulee-breaking-label {
          background:
            var(--jn-blue);
          padding: 6px 10px;
          border-radius: 5px;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .3px;
          white-space: nowrap;
          box-shadow:
            0 3px 12px rgba(37,99,235,.3);
        }

        .jnmulee-breaking-live {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #60a5fa;
          font-size: 9px;
          font-weight: 950;
          white-space: nowrap;
        }

        .jnmulee-breaking-live i {
          width: 6px;
          height: 6px;
          display: inline-block;
          border-radius: 50%;
          background: #60a5fa;
          box-shadow:
            0 0 0 4px rgba(96,165,250,.1);
        }

        .jnmulee-breaking-title {
          flex: 1;
          min-width: 0;
          color: #fff;
          text-decoration: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 650;
        }

        .jnmulee-breaking-title:hover {
          color: #93c5fd;
        }

        .jnmulee-breaking-arrow {
          color: #60a5fa;
          font-size: 16px;
          font-weight: 800;
        }

        .jnmulee-home {
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
          padding: 30px 18px 75px;
        }

        .jnmulee-hero-section {
          margin-bottom: 34px;
        }

        .jnmulee-hero-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.72fr)
            minmax(300px, .9fr);
          gap: 24px;
        }

        .jnmulee-story-card {
          background: var(--jn-card);
          border:
            1px solid var(--jn-border);
          border-radius: 14px;
          overflow: hidden;
          box-shadow:
            var(--jn-shadow);
          transition:
            transform .22s ease,
            box-shadow .22s ease,
            border-color .22s ease;
        }

        .jnmulee-story-card:hover {
          transform:
            translateY(-3px);
          box-shadow:
            var(--jn-shadow-hover);
          border-color:
            #d2dae7;
        }

        .jnmulee-story-link {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .jnmulee-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          background:
            #edf1f6;
          overflow: hidden;
        }

        .jnmulee-image-wrap-large {
          aspect-ratio: 16 / 9;
        }

        .jnmulee-story-image {
          object-fit: cover;
          transition:
            transform .5s ease;
        }

        .jnmulee-story-card:hover
        .jnmulee-story-image {
          transform:
            scale(1.025);
        }

        .jnmulee-featured-overlay {
          position: absolute;
          left: 16px;
          top: 16px;
          z-index: 2;
        }

        .jnmulee-featured-overlay span {
          display: inline-block;
          padding: 6px 9px;
          border-radius: 5px;
          background:
            rgba(11,18,32,.88);
          color: #fff;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .7px;
        }

        .jnmulee-image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 7px;
          width: 100%;
          aspect-ratio: 16 / 10;
          background:
            linear-gradient(
              135deg,
              #eaf0f8,
              #f5f7fb
            );
          color: #8793a4;
          font-size: 12px;
          font-weight: 800;
        }

        .jnmulee-placeholder-mark {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background:
            var(--jn-navy);
          color: #60a5fa;
          font-size: 10px;
          font-weight: 950;
        }

        .jnmulee-story-content {
          padding: 17px 18px 18px;
        }

        .jnmulee-story-content-large {
          padding: 22px 24px 25px;
        }

        .jnmulee-story-category {
          color:
            var(--jn-blue);
          text-transform:
            uppercase;
          font-size: 9px;
          letter-spacing: .65px;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .jnmulee-story-title {
          margin: 0;
          color:
            var(--jn-text);
          font-size: 1.06rem;
          line-height: 1.3;
          font-weight: 900;
          letter-spacing:
            -.25px;
        }

        .jnmulee-story-title-large {
          font-size:
            clamp(1.55rem, 3vw, 2.5rem);
          line-height: 1.11;
          letter-spacing:
            -.7px;
        }

        .jnmulee-story-excerpt {
          margin: 12px 0 0;
          color:
            var(--jn-text-soft);
          font-size: 13.5px;
          line-height: 1.65;
        }

        .jnmulee-story-meta {
          display: flex;
          gap: 7px;
          align-items: center;
          margin-top: 13px;
          color:
            var(--jn-muted);
          font-size: 10px;
          font-weight: 650;
        }

        .jnmulee-meta-dot {
          color:
            #a9b3c0;
        }

        .jnmulee-hero-side {
          background:
            var(--jn-card);
          border:
            1px solid var(--jn-border);
          border-radius: 14px;
          padding: 18px;
          box-shadow:
            var(--jn-shadow);
        }

        .jnmulee-side-heading {
          display: flex;
          justify-content:
            space-between;
          align-items:
            center;
          border-bottom:
            2px solid var(--jn-blue);
          padding-bottom: 11px;
          margin-bottom: 3px;
        }

        .jnmulee-side-heading > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .jnmulee-side-heading-label {
          color:
            var(--jn-blue);
          font-size: 8px;
          letter-spacing: .9px;
          font-weight: 950;
        }

        .jnmulee-side-heading strong {
          color:
            var(--jn-text);
          font-size: 21px;
          line-height: 1;
          font-weight: 950;
        }

        .jnmulee-side-heading a {
          color:
            var(--jn-blue);
          text-decoration: none;
          font-size: 11px;
          font-weight: 900;
        }

        .jnmulee-compact-story {
          display: grid;
          grid-template-columns:
            86px minmax(0,1fr);
          gap: 12px;
          padding: 13px 0;
          border-bottom:
            1px solid #edf1f5;
          color: inherit;
          text-decoration: none;
        }

        .jnmulee-compact-story:last-child {
          border-bottom: 0;
        }

        .jnmulee-compact-image-wrap {
          position: relative;
          width: 86px;
          height: 65px;
          border-radius: 8px;
          overflow: hidden;
          background:
            #edf1f6;
        }

        .jnmulee-compact-image {
          object-fit: cover;
          transition:
            transform .35s ease;
        }

        .jnmulee-compact-story:hover
        .jnmulee-compact-image {
          transform:
            scale(1.05);
        }

        .jnmulee-compact-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 86px;
          height: 65px;
          border-radius: 8px;
          background:
            var(--jn-navy);
          color:
            #60a5fa;
          font-size: 10px;
          font-weight: 950;
        }

        .jnmulee-compact-category {
          color:
            var(--jn-blue);
          font-size: 8px;
          text-transform:
            uppercase;
          letter-spacing: .5px;
          font-weight: 950;
          margin-bottom: 4px;
        }

        .jnmulee-compact-title {
          color:
            var(--jn-text);
          font-size: 12.5px;
          line-height: 1.34;
          font-weight: 850;
        }

        .jnmulee-compact-story:hover
        .jnmulee-compact-title {
          color:
            var(--jn-blue);
        }

        .jnmulee-compact-date {
          color:
            #8a95a4;
          font-size: 9px;
          margin-top: 5px;
        }

        .jnmulee-ad-wrap {
          margin:
            7px 0 38px;
          width: 100%;
        }

        .jnmulee-section {
          margin-bottom: 45px;
        }

        .jnmulee-section-header {
          display: flex;
          align-items: flex-end;
          justify-content:
            space-between;
          gap: 20px;
          border-bottom:
            1px solid var(--jn-border);
          padding-bottom: 10px;
          margin-bottom: 19px;
          position: relative;
        }

        .jnmulee-section-header::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -1px;
          width: 58px;
          height: 3px;
          background:
            var(--jn-blue);
          border-radius:
            3px 3px 0 0;
        }

        .jnmulee-section-eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          color:
            var(--jn-blue);
          font-size: 8px;
          letter-spacing: .85px;
          font-weight: 950;
          margin-bottom: 3px;
          text-transform:
            uppercase;
        }

        .jnmulee-eyebrow-line {
          width: 16px;
          height: 2px;
          background:
            var(--jn-blue);
          border-radius: 2px;
        }

        .jnmulee-section-title {
          margin: 0;
          color:
            var(--jn-text);
          font-size:
            clamp(1.45rem, 3vw, 1.85rem);
          line-height: 1.08;
          font-weight: 950;
          letter-spacing:
            -.5px;
        }

        .jnmulee-view-all {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color:
            var(--jn-blue);
          text-decoration: none;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .jnmulee-view-all span {
          font-size: 15px;
          transition:
            transform .2s ease;
        }

        .jnmulee-view-all:hover span {
          transform:
            translateX(3px);
        }

        .jnmulee-trending-grid {
          display: grid;
          grid-template-columns:
            repeat(5,minmax(0,1fr));
          gap: 12px;
        }

        .jnmulee-trending-card {
          display: grid;
          grid-template-columns:
            31px 1fr;
          gap: 9px;
          min-height: 112px;
          padding: 15px;
          border:
            1px solid var(--jn-border);
          border-radius: 10px;
          background:
            var(--jn-card);
          color: inherit;
          text-decoration: none;
          box-shadow:
            0 2px 9px rgba(15,23,42,.025);
          transition:
            transform .2s ease,
            border-color .2s ease,
            box-shadow .2s ease;
        }

        .jnmulee-trending-card:hover {
          transform:
            translateY(-2px);
          border-color:
            #bfd1ed;
          box-shadow:
            0 10px 25px rgba(15,23,42,.07);
        }

        .jnmulee-trending-number {
          color:
            #c5cedb;
          font-size: 21px;
          font-weight: 950;
          line-height: 1;
        }

        .jnmulee-trending-card:hover
        .jnmulee-trending-number {
          color:
            var(--jn-blue);
        }

        .jnmulee-trending-category {
          color:
            var(--jn-blue);
          font-size: 8px;
          letter-spacing: .55px;
          text-transform:
            uppercase;
          font-weight: 950;
          margin-bottom: 5px;
        }

        .jnmulee-trending-title {
          color:
            var(--jn-text);
          font-size: 12px;
          line-height: 1.4;
          font-weight: 850;
        }

        .jnmulee-most-read-box {
          background:
            var(--jn-card);
          border:
            1px solid var(--jn-border);
          border-radius: 14px;
          padding: 20px;
          box-shadow:
            var(--jn-shadow);
        }

        .jnmulee-most-read-grid {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          column-gap: 30px;
        }

        .jnmulee-most-read-item {
          display: grid;
          grid-template-columns:
            32px 82px minmax(0,1fr);
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 12px 0;
          border-bottom:
            1px solid #edf1f5;
          color: inherit;
          text-decoration: none;
        }

        .jnmulee-most-read-number {
          color:
            #c4ccd8;
          font-size: 17px;
          text-align: center;
        }

        .jnmulee-most-read-item:hover
        .jnmulee-most-read-number {
          color:
            var(--jn-blue);
        }

        .jnmulee-most-read-image-wrap {
          position: relative;
          width: 82px;
          height: 61px;
          border-radius: 7px;
          overflow: hidden;
          background:
            #edf1f6;
        }

        .jnmulee-most-read-image {
          object-fit: cover;
          transition:
            transform .35s ease;
        }

        .jnmulee-most-read-item:hover
        .jnmulee-most-read-image {
          transform:
            scale(1.05);
        }

        .jnmulee-most-read-placeholder {
          width: 82px;
          height: 61px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          background:
            var(--jn-navy);
          color:
            #60a5fa;
          font-size: 10px;
          font-weight: 950;
        }

        .jnmulee-most-read-title {
          color:
            var(--jn-text);
          font-size: 12.5px;
          line-height: 1.35;
          font-weight: 850;
        }

        .jnmulee-most-read-item:hover
        .jnmulee-most-read-title {
          color:
            var(--jn-blue);
        }

        .jnmulee-most-read-views {
          color:
            var(--jn-blue);
          font-size: 9px;
          font-weight: 800;
          margin-top: 5px;
        }

        .jnmulee-empty-message {
          color:
            var(--jn-muted);
          font-size: 13px;
          padding:
            5px 0 15px;
        }

        .jnmulee-news-grid {
          display: grid;
          grid-template-columns:
            repeat(3,minmax(0,1fr));
          gap: 20px;
        }

        .jnmulee-category-grid {
          display: grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          gap: 18px;
        }

        .jnmulee-empty {
          border:
            1px dashed #cbd4df;
          border-radius: 12px;
          padding: 38px;
          text-align: center;
          color:
            var(--jn-muted);
          background:
            rgba(255,255,255,.6);
        }

        .jnmulee-newsletter {
          position: relative;
          overflow: hidden;
          margin:
            48px 0 36px;
          padding:
            34px 36px;
          border-radius: 17px;
          background:
            linear-gradient(
              135deg,
              #09111f,
              #0d1830 60%,
              #13244a
            );
          color: #fff;
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 30px;
          box-shadow:
            0 15px 45px rgba(11,18,32,.16);
        }

        .jnmulee-newsletter::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          width: 4px;
          height: 100%;
          background:
            linear-gradient(
              #2563eb,
              #60a5fa
            );
        }

        .jnmulee-newsletter-glow {
          position: absolute;
          width: 300px;
          height: 300px;
          right: -100px;
          top: -140px;
          border-radius: 50%;
          background:
            rgba(37,99,235,.18);
          filter:
            blur(8px);
          pointer-events: none;
        }

        .jnmulee-newsletter-content {
          position: relative;
          z-index: 2;
        }

        .jnmulee-newsletter-label {
          color:
            #60a5fa;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 1.1px;
          margin-bottom: 8px;
        }

        .jnmulee-newsletter h2 {
          margin: 0;
          font-size:
            clamp(1.75rem,4vw,2.5rem);
          line-height: 1.04;
          font-weight: 950;
          letter-spacing:
            -.8px;
        }

        .jnmulee-newsletter h2 span {
          color:
            #60a5fa;
        }

        .jnmulee-newsletter p {
          max-width: 560px;
          margin:
            11px 0 0;
          color:
            #b9c6d9;
          line-height: 1.6;
          font-size: 13px;
        }

        .jnmulee-newsletter-button {
          position: relative;
          z-index: 2;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background:
            #2563eb;
          color: #fff;
          text-decoration: none;
          border:
            1px solid rgba(255,255,255,.08);
          border-radius: 999px;
          padding:
            12px 18px;
          font-size: 11px;
          font-weight: 900;
          box-shadow:
            0 8px 20px rgba(37,99,235,.25);
          transition:
            transform .2s ease,
            background .2s ease;
        }

        .jnmulee-newsletter-button:hover {
          background:
            #1d4ed8;
          transform:
            translateY(-2px);
        }

        .jnmulee-newsletter-button span {
          font-size: 15px;
        }

        .jnmulee-bottom-ad {
          margin-top: 15px;
        }

        @media (max-width:1050px) {
          .jnmulee-trending-grid {
            grid-template-columns:
              repeat(3,minmax(0,1fr));
          }

          .jnmulee-category-grid {
            grid-template-columns:
              repeat(3,minmax(0,1fr));
          }
        }

        @media (max-width:900px) {
          .jnmulee-hero-grid {
            grid-template-columns: 1fr;
          }

          .jnmulee-news-grid {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .jnmulee-category-grid {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .jnmulee-trending-grid {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .jnmulee-newsletter {
            align-items:
              flex-start;
            flex-direction:
              column;
          }

          .jnmulee-newsletter-button {
            margin-top: 5px;
          }
        }

        @media (max-width:650px) {
          .jnmulee-header-inner {
            padding:
              11px 14px;
            min-height: 62px;
          }

          .jnmulee-logo {
            gap: 8px;
          }

          .jnmulee-logo-mark {
            width: 36px;
            height: 36px;
            border-radius: 9px;
            font-size: 11px;
          }

          .jnmulee-logo-text {
            gap: 4px;
          }

          .jnmulee-logo-text strong {
            font-size:
              1.35rem;
            letter-spacing:
              -1px;
          }

          .jnmulee-logo-text em {
            font-size:
              .9rem;
          }

          .jnmulee-search-button {
            width: 36px;
            height: 36px;
            padding: 0;
            border-radius: 50%;
          }

          .jnmulee-search-text {
            display: none;
          }

          .jnmulee-search-icon {
            font-size: 21px;
          }

          .jnmulee-category-nav-inner {
            padding:
              0 14px;
            gap: 19px;
          }

          .jnmulee-nav-link {
            font-size: 11px;
            padding:
              14px 0;
          }

          .jnmulee-breaking-inner {
            padding:
              6px 14px;
            min-height: 40px;
          }

          .jnmulee-breaking-live {
            display: none;
          }

          .jnmulee-breaking-arrow {
            display: none;
          }

          .jnmulee-home {
            padding:
              20px 14px 52px;
          }

          .jnmulee-hero-section {
            margin-bottom: 27px;
          }

          .jnmulee-story-content-large {
            padding:
              18px;
          }

          .jnmulee-story-title-large {
            font-size:
              1.55rem;
            line-height:
              1.15;
          }

          .jnmulee-story-excerpt {
            font-size:
              13px;
          }

          .jnmulee-hero-side {
            padding:
              15px;
          }

          .jnmulee-most-read-grid {
            grid-template-columns:
              1fr;
          }

          .jnmulee-news-grid,
          .jnmulee-category-grid {
            grid-template-columns:
              1fr;
            gap: 15px;
          }

          .jnmulee-trending-grid {
            grid-template-columns:
              1fr;
          }

          .jnmulee-section {
            margin-bottom:
              35px;
          }

          .jnmulee-section-header {
            margin-bottom:
              15px;
          }

          .jnmulee-section-title {
            font-size:
              1.38rem;
          }

          .jnmulee-most-read-box {
            padding:
              17px;
          }

          .jnmulee-most-read-item {
            grid-template-columns:
              30px 76px minmax(0,1fr);
            gap: 8px;
          }

          .jnmulee-most-read-image-wrap,
          .jnmulee-most-read-placeholder {
            width: 76px;
            height: 57px;
          }

          .jnmulee-most-read-title {
            font-size:
              12px;
          }

          .jnmulee-newsletter {
            padding:
              26px 24px;
            margin:
              38px 0 28px;
          }

          .jnmulee-newsletter-button {
            width: 100%;
            justify-content:
              center;
            text-align: center;
          }

          .jnmulee-ad-wrap {
            margin-bottom:
              30px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            transition-duration:
              .01ms !important;
            animation-duration:
              .01ms !important;
            animation-iteration-count:
              1 !important;
          }
        }

      `}</style>
    </>
  );
}