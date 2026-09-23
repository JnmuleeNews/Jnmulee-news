import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DirectAd from "@/components/DirectAd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "JNMulee News | Latest News, Nigeria and World News",
  description:
    "JNMulee News brings you the latest Nigeria, world, business, technology, sports, entertainment, politics and crypto news.",
  alternates: {
    canonical:
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://jnmulee-news.vercel.app",
  },
  openGraph: {
    title:
      "JNMulee News | Latest News, Nigeria and World News",
    description:
      "Latest Nigeria, world, business, technology, sports, entertainment, politics and crypto news.",
    url:
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://jnmulee-news.vercel.app",
    siteName: "JNMulee News",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JNMulee News",
    description:
      "Latest news from Nigeria and around the world.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news.vercel.app";

const categories = [
  {
    name: "Top Stories",
    slug: "news",
  },
  {
    name: "Nigeria",
    slug: "nigeria",
  },
  {
    name: "World",
    slug: "world",
  },
  {
    name: "Business",
    slug: "business",
  },
  {
    name: "Technology",
    slug: "technology",
  },
  {
    name: "Sports",
    slug: "sports",
  },
  {
    name: "Entertainment",
    slug: "entertainment",
  },
  {
    name: "Gossip",
    slug: "gossip",
  },
  {
    name: "Politics",
    slug: "politics",
  },
  {
    name: "Crypto",
    slug: "crypto",
  },
];

type Story = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  image_url: string | null;
  category: string | null;
  created_at: string | null;
};

function getExcerpt(
  content: string | null,
  length = 130
) {
  if (!content) return "";

  const text = content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= length) {
    return text;
  }

  return `${text.substring(0, length).trim()}...`;
}

function formatDate(date: string | null) {
  if (!date) return "";

  return new Date(date).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function StoryCard({
  story,
  large = false,
}: {
  story: Story;
  large?: boolean;
}) {
  return (
    <article
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        overflow: "hidden",
        height: "100%",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <Link
        href={`/news/${story.slug}`}
        style={{
          textDecoration: "none",
          color: "inherit",
        }}
      >
        {story.image_url ? (
          <img
            src={story.image_url}
            alt={story.title}
            loading={large ? "eager" : "lazy"}
            style={{
              display: "block",
              width: "100%",
              aspectRatio: large
                ? "16 / 9"
                : "16 / 10",
              objectFit: "cover",
            }}
          />
        ) : null}

        <div
          style={{
            padding: large
              ? "22px"
              : "16px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              color: "#d7193f",
              fontWeight: 800,
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "8px",
            }}
          >
            {story.category || "News"}
          </span>

          <h2
            style={{
              margin: 0,
              fontSize: large
                ? "clamp(1.5rem, 3vw, 2.25rem)"
                : "1.1rem",
              lineHeight: 1.25,
              fontWeight: 800,
            }}
          >
            {story.title}
          </h2>

          {large ? (
            <p
              style={{
                margin:
                  "12px 0 10px",
                color: "#4b5563",
                lineHeight: 1.6,
              }}
            >
              {getExcerpt(
                story.content,
                170
              )}
            </p>
          ) : null}

          <time
            style={{
              display: "block",
              color: "#6b7280",
              fontSize: "12px",
              marginTop: "10px",
            }}
          >
            {formatDate(
              story.created_at
            )}
          </time>
        </div>
      </Link>
    </article>
  );
}

function CompactStory({
  story,
  number,
}: {
  story: Story;
  number: number;
}) {
  return (
    <Link
      href={`/news/${story.slug}`}
      style={{
        display: "grid",
        gridTemplateColumns:
          "38px 90px 1fr",
        gap: "12px",
        alignItems: "center",
        textDecoration: "none",
        color: "inherit",
        padding: "12px 0",
        borderBottom:
          "1px solid #e5e7eb",
      }}
    >
      <span
        style={{
          fontSize: "22px",
          fontWeight: 900,
          color: "#d7193f",
          textAlign: "center",
        }}
      >
        {number}
      </span>

      {story.image_url ? (
        <img
          src={story.image_url}
          alt={story.title}
          loading="lazy"
          style={{
            width: "90px",
            height: "65px",
            objectFit: "cover",
            borderRadius: "8px",
          }}
        />
      ) : (
        <div
          style={{
            width: "90px",
            height: "65px",
            background: "#f3f4f6",
            borderRadius: "8px",
          }}
        />
      )}

      <div>
        <h3
          style={{
            margin: 0,
            fontSize: "14px",
            lineHeight: 1.35,
            fontWeight: 750,
          }}
        >
          {story.title}
        </h3>

        <span
          style={{
            display: "block",
            color: "#6b7280",
            fontSize: "11px",
            marginTop: "6px",
          }}
        >
          {formatDate(
            story.created_at
          )}
        </span>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const { data: latestData } =
    await supabase
      .from("news")
      .select(
        "id,title,slug,content,image_url,category,created_at"
      )
      .eq("Published", true)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .order("created_at", {
        ascending: false,
      })
      .limit(24);

  const latest =
    (latestData || []) as Story[];

  const featured = latest[0] || null;

  const breakingNews = latest.slice(
    0,
    5
  );

  const trending = latest.slice(
    1,
    7
  );

  const categoryStories: Record<
    string,
    Story[]
  > = {};

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
            .select(
              "id,title,slug,content,image_url,category,created_at"
            )
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
                ascending: false,
              }
            )
            .limit(4);

        categoryStories[
          category.slug
        ] = (data ||
          []) as Story[];
      })
  );

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: "JNMulee News",
    url: SITE_URL,
    description:
      "JNMulee News brings you the latest news from Nigeria and around the world.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              websiteSchema
            ),
        }}
      />

      <header
        style={{
          background: "#d7193f",
          color: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow:
            "0 2px 10px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding:
              "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: "15px",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#ffffff",
              textDecoration: "none",
              fontSize:
                "clamp(1.35rem, 4vw, 2rem)",
              fontWeight: 900,
            }}
          >
            JNMulee News
          </Link>

          <Link
            href="/search"
            style={{
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            🔎 Search
          </Link>
        </div>
      </header>

      <nav
        style={{
          background: "#ffffff",
          borderBottom:
            "1px solid #e5e7eb",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding:
              "10px 16px",
            display: "flex",
            gap: "9px",
            whiteSpace: "nowrap",
          }}
        >
          {categories.map(
            (category) => (
              <Link
                key={category.slug}
                href={
                  category.slug ===
                  "news"
                    ? "/"
                    : `/category/${category.slug}`
                }
                style={{
                  padding:
                    "8px 13px",
                  borderRadius:
                    "999px",
                  background:
                    "#f3f4f6",
                  color: "#111827",
                  textDecoration:
                    "none",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                {category.name}
              </Link>
            )
          )}
        </div>
      </nav>

      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding:
            "0 16px 60px",
        }}
      >
        {breakingNews.length >
        0 ? (
          <section
            aria-label="Breaking news"
            style={{
              marginTop: "18px",
              background:
                "#111827",
              color: "#ffffff",
              borderRadius: "10px",
              overflow: "hidden",
              display: "flex",
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                background:
                  "#d7193f",
                padding:
                  "12px 15px",
                fontWeight: 900,
                whiteSpace:
                  "nowrap",
                fontSize: "13px",
              }}
            >
              🔴 BREAKING
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "28px",
                padding:
                  "0 16px",
                overflowX: "auto",
                whiteSpace:
                  "nowrap",
              }}
            >
              {breakingNews.map(
                (story) => (
                  <Link
                    key={story.id}
                    href={`/news/${story.slug}`}
                    style={{
                      color:
                        "#ffffff",
                      textDecoration:
                        "none",
                      fontSize:
                        "13px",
                      fontWeight:
                        650,
                    }}
                  >
                    {story.title}
                  </Link>
                )
              )}
            </div>
          </section>
        ) : null}

        <section
          style={{
            paddingTop: "28px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 2fr) minmax(280px, 1fr)",
              gap: "24px",
            }}
          >
            {featured ? (
              <StoryCard
                story={featured}
                large
              />
            ) : (
              <div
                style={{
                  padding: "40px",
                  border:
                    "1px solid #e5e7eb",
                  borderRadius: "14px",
                }}
              >
                No news available yet.
              </div>
            )}

            <aside
              style={{
                background:
                  "#ffffff",
                border:
                  "1px solid #e5e7eb",
                borderRadius:
                  "14px",
                padding:
                  "18px",
              }}
            >
              <h2
                style={{
                  margin:
                    "0 0 8px",
                  fontSize:
                    "24px",
                  fontWeight: 900,
                }}
              >
                🔥 Trending
              </h2>

              <p
                style={{
                  margin:
                    "0 0 4px",
                  color:
                    "#6b7280",
                  fontSize:
                    "12px",
                }}
              >
                Latest stories readers
                can catch up on.
              </p>

              <div>
                {trending.map(
                  (
                    story,
                    index
                  ) => (
                    <CompactStory
                      key={story.id}
                      story={story}
                      number={
                        index + 1
                      }
                    />
                  )
                )}
              </div>
            </aside>
          </div>
        </section>

        <div
          style={{
            margin:
              "28px 0",
          }}
        >
          <DirectAd
            placement="homepage"
          />
        </div>

        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "12px",
              marginBottom:
                "18px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize:
                  "clamp(1.6rem, 4vw, 2rem)",
                fontWeight: 900,
              }}
            >
              Latest News
            </h2>

            <Link
              href="/search"
              style={{
                color:
                  "#d7193f",
                textDecoration:
                  "none",
                fontWeight: 800,
                fontSize:
                  "13px",
              }}
            >
              View all →
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: "18px",
            }}
          >
            {latest
              .slice(1, 13)
              .map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                />
              ))}
          </div>
        </section>

        <div
          style={{
            margin:
              "36px 0",
          }}
        >
          <DirectAd
            placement="home_between"
          />
        </div>

        {categories
          .filter(
            (category) =>
              category.slug !==
              "news"
          )
          .map((category) => {
            const stories =
              categoryStories[
                category.slug
              ] || [];

            if (!stories.length) {
              return null;
            }

            return (
              <section
                key={
                  category.slug
                }
                style={{
                  marginTop:
                    "42px",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    gap: "12px",
                    marginBottom:
                      "18px",
                    borderBottom:
                      "3px solid #d7193f",
                    paddingBottom:
                      "10px",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize:
                        "clamp(1.4rem, 4vw, 1.9rem)",
                      fontWeight:
                        900,
                    }}
                  >
                    {category.name}
                  </h2>

                  <Link
                    href={`/category/${category.slug}`}
                    style={{
                      color:
                        "#d7193f",
                      textDecoration:
                        "none",
                      fontWeight:
                        800,
                      fontSize:
                        "13px",
                    }}
                  >
                    More →
                  </Link>
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: "18px",
                  }}
                >
                  {stories.map(
                    (story) => (
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
          })}

        <div
          style={{
            margin:
              "45px 0 20px",
          }}
        >
          <DirectAd
            placement="home_bottom"
          />
        </div>
      </main>

      <style>{`
        @media (max-width: 900px) {
          main > section:first-of-type > div {
            grid-template-columns: 1fr !important;
          }

          section[aria-label="Breaking news"] {
            margin-left: 0;
            margin-right: 0;
          }
        }

        @media (max-width: 760px) {
          main {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          main > section:not([aria-label="Breaking news"]) {
            width: 100%;
          }

          main section div[style*="repeat(4"] {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          nav div {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
        }

        @media (max-width: 480px) {
          main section div[style*="repeat(4"] {
            grid-template-columns: 1fr !important;
          }

          h1 {
            word-break: normal;
          }
        }
      `}</style>
    </>
  );
}