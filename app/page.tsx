import type { Metadata } from "next";
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

function excerpt(
  content: string | null,
  length = 170
) {
  const text = cleanText(content);

  if (!text) return "";

  return text.length > length
    ? `${text.slice(0, length).trim()}...`
    : text;
}

function dateText(date: string | null) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(date: string | null) {
  if (!date) return "";

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const seconds = Math.floor(
    (Date.now() - timestamp) / 1000
  );

  if (seconds < 60) {
    return "Just now";
  }

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

  return dateText(date);
}

function imageUrl(url: string | null) {
  if (!url) return null;

  return `/api/image?url=${encodeURIComponent(url)}`;
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
        {story.image_url ? (
          <img
            src={imageUrl(story.image_url) || ""}
            alt={story.title}
            loading={large ? "eager" : "lazy"}
            className={
              large
                ? "jnmulee-story-image jnmulee-story-image-large"
                : "jnmulee-story-image"
            }
          />
        ) : (
          <div className="jnmulee-image-placeholder">
            JNMulee News
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
              {excerpt(story.content, large ? 220 : 150)}
            </p>
          )}

          <div className="jnmulee-story-meta">
            <time dateTime={story.created_at || undefined}>
              {timeAgo(story.created_at)}
            </time>

            {story.view_count !== undefined &&
              story.view_count !== null && (
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
  return (
    <Link
      href={`/news/${story.slug}`}
      className="jnmulee-compact-story"
    >
      {story.image_url ? (
        <img
          src={imageUrl(story.image_url) || ""}
          alt={story.title}
          loading="lazy"
          className="jnmulee-compact-image"
        />
      ) : (
        <div className="jnmulee-compact-placeholder">
          News
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
  return (
    <Link
      href={`/news/${story.slug}`}
      className="jnmulee-most-read-item"
    >
      <strong className="jnmulee-most-read-number">
        {String(number).padStart(2, "0")}
      </strong>

      {story.image_url ? (
        <img
          src={imageUrl(story.image_url) || ""}
          alt={story.title}
          loading="lazy"
          className="jnmulee-most-read-image"
        />
      ) : (
        <div className="jnmulee-most-read-placeholder" />
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
          View All →
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const storySelect =
    "id,title,slug,content,image_url,category,created_at,view_count";

  const [
    latestResult,
    mostReadResult,
  ] = await Promise.all([
    supabase
      .from("news")
      .select(storySelect)
      .eq("Published", true)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .order("created_at", {
        ascending: false,
      })
      .limit(30),

    supabase
      .from("news")
      .select(storySelect)
      .eq("Published", true)
      .not("image_url", "is", null)
      .neq("image_url", "")
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

  const categoryStories:
    Record<string, Story[]> = {};

  await Promise.all(
    categories
      .filter(
        (category) =>
          category.slug !== "news"
      )
      .map(async (category) => {
        const { data } =
          await supabase
            .from("news")
            .select(storySelect)
            .eq("Published", true)
            .eq(
              "category",
              category.name
            )
            .not(
              "image_url",
              "is",
              null
            )
            .neq(
              "image_url",
              ""
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(4);

        categoryStories[
          category.slug
        ] = (data || []) as Story[];
      })
  );

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
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="jnmulee-main-header">
        <div className="jnmulee-header-inner">
          <Link
            href="/"
            className="jnmulee-logo"
          >
            JNMulee
            <span>News</span>
          </Link>

          <div className="jnmulee-header-actions">
            <Link
              href="/search"
              className="jnmulee-search-button"
            >
              <span>🔎</span>
              <span>Search</span>
            </Link>
          </div>
        </div>
      </header>

      {/* =====================================================
          CATEGORY NAVIGATION
      ====================================================== */}

      <nav
        className="jnmulee-category-nav"
        aria-label="News categories"
      >
        <div className="jnmulee-category-nav-inner">
          {categories.map(
            (category) => (
              <Link
                key={
                  category.slug
                }
                href={`/category/${category.slug}`}
                className="jnmulee-nav-link"
              >
                {category.name}
              </Link>
            )
          )}
        </div>
      </nav>

      {/* =====================================================
          BREAKING NEWS BAR
      ====================================================== */}

      <div className="jnmulee-breaking-bar">
        <div className="jnmulee-breaking-inner">
          <span className="jnmulee-breaking-label">
            BREAKING
          </span>

          <span className="jnmulee-breaking-live">
            ● LIVE
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
        </div>
      </div>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="jnmulee-home">
        {/* HERO */}

        {featured && (
          <section className="jnmulee-hero-section">
            <div className="jnmulee-hero-grid">
              <StoryCard
                story={featured}
                large
              />

              <div className="jnmulee-hero-side">
                <div className="jnmulee-side-heading">
                  <span>Latest</span>
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

        {/* TOP AD */}

        <div className="jnmulee-ad-wrap">
          <DirectAd placement="homepage" />
        </div>

        {/* =====================================================
            TRENDING
        ====================================================== */}

        {trending.length > 0 && (
          <section className="jnmulee-section">
            <SectionHeader
              title="Trending Now"
              eyebrow="WHAT PEOPLE ARE READING"
            />

            <div className="jnmulee-trending-grid">
              {trending.map(
                (
                  story,
                  index
                ) => (
                  <Link
                    href={`/news/${story.slug}`}
                    key={story.id}
                    className="jnmulee-trending-card"
                  >
                    <div className="jnmulee-trending-number">
                      {index + 1}
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

        {/* =====================================================
            MOST READ
        ====================================================== */}

        <section className="jnmulee-section">
          <div className="jnmulee-most-read-box">
            <SectionHeader
              title="Most Read"
              eyebrow="POPULAR STORIES"
            />

            <div className="jnmulee-most-read-grid">
              {mostRead.length > 0 ? (
                mostRead.map(
                  (
                    story,
                    index
                  ) => (
                    <MostReadItem
                      key={
                        story.id
                      }
                      story={
                        story
                      }
                      number={
                        index + 1
                      }
                    />
                  )
                )
              ) : (
                <p>
                  Popular stories
                  will appear
                  here as readers
                  visit the
                  site.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            LATEST NEWS
        ====================================================== */}

        <section className="jnmulee-section">
          <SectionHeader
            title="Latest News"
            slug="news"
            eyebrow="JUST IN"
          />

          {latestGrid.length > 0 ? (
            <div className="jnmulee-news-grid">
              {latestGrid.map(
                (story) => (
                  <StoryCard
                    key={
                      story.id
                    }
                    story={
                      story
                    }
                    showExcerpt
                  />
                )
              )}
            </div>
          ) : (
            <div className="jnmulee-empty">
              No latest stories
              available yet.
            </div>
          )}
        </section>

        {/* MID PAGE AD */}

        <div className="jnmulee-ad-wrap">
          <DirectAd
            placement="home_between"
          />
        </div>

        {/* =====================================================
            CATEGORY SECTIONS
        ====================================================== */}

        {categories
          .filter(
            (category) =>
              category.slug !==
              "news"
          )
          .map(
            (category) => {
              const stories =
                categoryStories[
                  category.slug
                ] || [];

              if (
                stories.length ===
                0
              ) {
                return null;
              }

              return (
                <section
                  key={
                    category.slug
                  }
                  className="jnmulee-section jnmulee-category-section"
                >
                  <SectionHeader
                    title={
                      category.name
                    }
                    slug={
                      category.slug
                    }
                  />

                  <div className="jnmulee-category-grid">
                    {stories.map(
                      (
                        story
                      ) => (
                        <StoryCard
                          key={
                            story.id
                          }
                          story={
                            story
                          }
                        />
                      )
                    )}
                  </div>
                </section>
              );
            }
          )}

        {/* =====================================================
            NEWSLETTER / FOLLOW CTA
        ====================================================== */}

        <section className="jnmulee-newsletter">
          <div>
            <div className="jnmulee-newsletter-label">
              JNMULEE NEWS
            </div>

            <h2>
              Stay informed.
              <br />
              Stay ahead.
            </h2>

            <p>
              Follow JNMulee News
              for breaking stories,
              Nigeria news and
              important updates.
            </p>
          </div>

          <Link
            href="/search"
            className="jnmulee-newsletter-button"
          >
            Explore More News →
          </Link>
        </section>

        {/* BOTTOM AD */}

        <div className="jnmulee-ad-wrap jnmulee-bottom-ad">
          <DirectAd
            placement="home_bottom"
          />
        </div>
      </main>

      {/* =====================================================
          HOMEPAGE STYLES
      ====================================================== */}

      <style>{`
        .jnmulee-main-header {
          background: #d7193f;
          color: #fff;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 3px 15px rgba(0,0,0,.14);
        }

        .jnmulee-header-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 13px 18px;
          min-height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .jnmulee-logo {
          color: #fff;
          text-decoration: none;
          font-size: clamp(1.55rem, 4vw, 2.15rem);
          font-weight: 950;
          letter-spacing: -1.3px;
          line-height: 1;
        }

        .jnmulee-logo span {
          font-weight: 500;
          margin-left: 5px;
        }

        .jnmulee-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .jnmulee-search-button {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #fff;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,.45);
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 800;
          transition: .2s ease;
        }

        .jnmulee-search-button:hover {
          background: rgba(255,255,255,.12);
        }

        .jnmulee-category-nav {
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          position: relative;
          z-index: 40;
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
          min-height: 45px;
          display: flex;
          align-items: center;
          gap: 23px;
          white-space: nowrap;
        }

        .jnmulee-nav-link {
          color: #252525;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          padding: 14px 0;
          position: relative;
        }

        .jnmulee-nav-link:hover {
          color: #d7193f;
        }

        .jnmulee-nav-link:first-child {
          color: #d7193f;
        }

        .jnmulee-breaking-bar {
          background: #111827;
          color: #fff;
        }

        .jnmulee-breaking-inner {
          max-width: 1240px;
          margin: 0 auto;
          min-height: 42px;
          padding: 6px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .jnmulee-breaking-label {
          background: #d7193f;
          padding: 6px 9px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .4px;
          white-space: nowrap;
        }

        .jnmulee-breaking-live {
          color: #ff5575;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .jnmulee-breaking-title {
          color: #fff;
          text-decoration: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 650;
        }

        .jnmulee-home {
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
          padding: 28px 18px 70px;
          min-height: calc(100vh - 160px);
        }

        .jnmulee-hero-section {
          margin-bottom: 30px;
        }

        .jnmulee-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(300px, .9fr);
          gap: 22px;
        }

        .jnmulee-story-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 3px 14px rgba(0,0,0,.055);
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .jnmulee-story-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,.10);
        }

        .jnmulee-story-link {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .jnmulee-story-image {
          display: block;
          width: 100%;
          aspect-ratio: 16 / 10;
          object-fit: cover;
          background: #f3f4f6;
        }

        .jnmulee-story-image-large {
          aspect-ratio: 16 / 9;
        }

        .jnmulee-image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          aspect-ratio: 16 / 10;
          background: #f3f4f6;
          color: #9ca3af;
          font-size: 14px;
          font-weight: 800;
        }

        .jnmulee-story-content {
          padding: 16px;
        }

        .jnmulee-story-content-large {
          padding: 22px 24px 24px;
        }

        .jnmulee-story-category {
          color: #d7193f;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: .55px;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .jnmulee-story-title {
          margin: 0;
          font-size: 1.08rem;
          line-height: 1.3;
          font-weight: 900;
          letter-spacing: -.25px;
        }

        .jnmulee-story-title-large {
          font-size: clamp(1.55rem, 3vw, 2.45rem);
          line-height: 1.13;
          letter-spacing: -.7px;
        }

        .jnmulee-story-excerpt {
          margin: 12px 0 0;
          color: #596170;
          font-size: 14px;
          line-height: 1.65;
        }

        .jnmulee-story-meta {
          display: flex;
          gap: 7px;
          align-items: center;
          margin-top: 13px;
          color: #737b88;
          font-size: 11px;
          font-weight: 650;
        }

        .jnmulee-hero-side {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 3px 14px rgba(0,0,0,.045);
        }

        .jnmulee-side-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #d7193f;
          padding-bottom: 9px;
          margin-bottom: 4px;
        }

        .jnmulee-side-heading span {
          font-size: 21px;
          font-weight: 950;
        }

        .jnmulee-side-heading a {
          color: #d7193f;
          text-decoration: none;
          font-size: 12px;
          font-weight: 850;
        }

        .jnmulee-compact-story {
          display: grid;
          grid-template-columns: 86px minmax(0,1fr);
          gap: 11px;
          padding: 13px 0;
          border-bottom: 1px solid #edf0f2;
          color: inherit;
          text-decoration: none;
        }

        .jnmulee-compact-story:last-child {
          border-bottom: 0;
        }

        .jnmulee-compact-image,
        .jnmulee-compact-placeholder {
          width: 86px;
          height: 65px;
          object-fit: cover;
          border-radius: 7px;
          background: #f1f3f5;
        }

        .jnmulee-compact-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 10px;
          font-weight: 800;
        }

        .jnmulee-compact-category {
          color: #d7193f;
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 950;
          margin-bottom: 4px;
        }

        .jnmulee-compact-title {
          font-size: 13px;
          line-height: 1.32;
          font-weight: 850;
        }

        .jnmulee-compact-date {
          color: #858c97;
          font-size: 10px;
          margin-top: 5px;
        }

        .jnmulee-ad-wrap {
          margin: 5px 0 34px;
          width: 100%;
        }

        .jnmulee-section {
          margin-bottom: 42px;
        }

        .jnmulee-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 3px solid #d7193f;
          padding-bottom: 9px;
          margin-bottom: 18px;
        }

        .jnmulee-section-eyebrow {
          color: #d7193f;
          font-size: 9px;
          letter-spacing: .8px;
          font-weight: 950;
          margin-bottom: 2px;
          text-transform: uppercase;
        }

        .jnmulee-section-title {
          margin: 0;
          font-size: clamp(1.45rem, 3vw, 1.8rem);
          line-height: 1.1;
          font-weight: 950;
          letter-spacing: -.5px;
        }

        .jnmulee-view-all {
          color: #d7193f;
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .jnmulee-trending-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0,1fr));
          gap: 12px;
        }

        .jnmulee-trending-card {
          display: grid;
          grid-template-columns: 31px 1fr;
          gap: 9px;
          min-height: 108px;
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          color: inherit;
          text-decoration: none;
          transition: .2s ease;
        }

        .jnmulee-trending-card:hover {
          border-color: #d7193f;
          transform: translateY(-2px);
        }

        .jnmulee-trending-number {
          color: #d7193f;
          font-size: 22px;
          font-weight: 950;
          line-height: 1;
        }

        .jnmulee-trending-category {
          color: #d7193f;
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 950;
          margin-bottom: 5px;
        }

        .jnmulee-trending-title {
          font-size: 13px;
          line-height: 1.35;
          font-weight: 850;
        }

        .jnmulee-most-read-box {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 19px;
          box-shadow: 0 3px 14px rgba(0,0,0,.04);
        }

        .jnmulee-most-read-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 28px;
        }

        .jnmulee-most-read-item {
          display: grid;
          grid-template-columns: 32px 82px minmax(0,1fr);
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 12px 0;
          border-bottom: 1px solid #edf0f2;
          color: inherit;
          text-decoration: none;
        }

        .jnmulee-most-read-number {
          color: #d7193f;
          font-size: 17px;
          text-align: center;
        }

        .jnmulee-most-read-image,
        .jnmulee-most-read-placeholder {
          width: 82px;
          height: 61px;
          object-fit: cover;
          border-radius: 7px;
          background: #f1f3f5;
        }

        .jnmulee-most-read-title {
          font-size: 13px;
          line-height: 1.34;
          font-weight: 850;
        }

        .jnmulee-most-read-views {
          color: #d7193f;
          font-size: 10px;
          font-weight: 800;
          margin-top: 5px;
        }

        .jnmulee-news-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 20px;
        }

        .jnmulee-category-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 18px;
        }

        .jnmulee-empty {
          border: 1px dashed #d1d5db;
          border-radius: 12px;
          padding: 35px;
          text-align: center;
          color: #737b88;
        }

        .jnmulee-newsletter {
          margin: 45px 0 35px;
          padding: 30px 32px;
          border-radius: 16px;
          background: #111827;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
        }

        .jnmulee-newsletter-label {
          color: #ff5575;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 1px;
          margin-bottom: 7px;
        }

        .jnmulee-newsletter h2 {
          margin: 0;
          font-size: clamp(1.7rem, 4vw, 2.4rem);
          line-height: 1.05;
          font-weight: 950;
        }

        .jnmulee-newsletter p {
          max-width: 560px;
          margin: 10px 0 0;
          color: #cbd5e1;
          line-height: 1.6;
          font-size: 14px;
        }

        .jnmulee-newsletter-button {
          flex-shrink: 0;
          background: #d7193f;
          color: #fff;
          text-decoration: none;
          border-radius: 999px;
          padding: 12px 18px;
          font-size: 12px;
          font-weight: 900;
          transition: .2s ease;
        }

        .jnmulee-newsletter-button:hover {
          background: #b81234;
        }

        .jnmulee-bottom-ad {
          margin-top: 15px;
        }

        @media (max-width: 1050px) {
          .jnmulee-trending-grid {
            grid-template-columns: repeat(3, minmax(0,1fr));
          }

          .jnmulee-category-grid {
            grid-template-columns: repeat(3, minmax(0,1fr));
          }
        }

        @media (max-width: 900px) {
          .jnmulee-hero-grid {
            grid-template-columns: 1fr;
          }

          .jnmulee-news-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .jnmulee-category-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .jnmulee-trending-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .jnmulee-newsletter {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 650px) {
          .jnmulee-header-inner {
            padding: 12px 14px;
          }

          .jnmulee-category-nav-inner {
            padding: 0 14px;
            gap: 18px;
          }

          .jnmulee-breaking-inner {
            padding: 6px 14px;
          }

          .jnmulee-breaking-live {
            display: none;
          }

          .jnmulee-home {
            padding: 20px 14px 50px;
          }

          .jnmulee-story-content-large {
            padding: 18px;
          }

          .jnmulee-story-title-large {
            font-size: 1.55rem;
          }

          .jnmulee-most-read-grid {
            grid-template-columns: 1fr;
          }

          .jnmulee-news-grid,
          .jnmulee-category-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .jnmulee-trending-grid {
            grid-template-columns: 1fr;
          }

          .jnmulee-section {
            margin-bottom: 34px;
          }

          .jnmulee-section-header {
            margin-bottom: 14px;
          }

          .jnmulee-section-title {
            font-size: 1.4rem;
          }

          .jnmulee-newsletter {
            padding: 24px;
          }

          .jnmulee-newsletter-button {
            width: 100%;
            text-align: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .jnmulee-story-card,
          .jnmulee-trending-card {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}