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
      "https://jnmulee-news-jnnation.vercel.app",
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

const categories = [
  { name: "Top Stories", slug: "news" },
  { name: "Nigeria", slug: "nigeria" },
  { name: "World", slug: "world" },
  { name: "Business", slug: "business" },
  { name: "Technology", slug: "technology" },
  { name: "Sports", slug: "sports" },
  { name: "Entertainment", slug: "entertainment" },
  { name: "Gossip", slug: "gossip" },
  { name: "Politics", slug: "politics" },
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

function excerpt(
  content: string | null,
  length = 150
) {
  if (!content) return "";

  const text = content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > length
    ? `${text.slice(0, length).trim()}...`
    : text;
}

function dateText(date: string | null) {
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
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,.05)",
      }}
    >
      <Link
        href={`/news/${story.slug}`}
        style={{
          color: "inherit",
          textDecoration: "none",
        }}
      >
        {story.image_url && (
          <img
            src={`/api/image?url=${encodeURIComponent(
              story.image_url
            )}`}
            alt={story.title}
            loading={large ? "eager" : "lazy"}
            style={{
              display: "block",
              width: "100%",
              aspectRatio: large
                ? "16/9"
                : "16/10",
              objectFit: "cover",
            }}
          />
        )}

        <div
          style={{
            padding: large ? 22 : 16,
          }}
        >
          <div
            style={{
              color: "#d7193f",
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {story.category || "News"}
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: large
                ? "clamp(1.5rem,3vw,2.25rem)"
                : "1.1rem",
              lineHeight: 1.25,
              fontWeight: 800,
            }}
          >
            {story.title}
          </h2>

          {large && (
            <p
              style={{
                color: "#4b5563",
                lineHeight: 1.6,
                margin: "12px 0",
              }}
            >
              {excerpt(story.content, 180)}
            </p>
          )}

          <time
            style={{
              color: "#6b7280",
              fontSize: 12,
            }}
          >
            {dateText(story.created_at)}
          </time>
        </div>
      </Link>
    </article>
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
      style={{
        display: "grid",
        gridTemplateColumns:
          "35px 80px 1fr",
        gap: 10,
        alignItems: "center",
        color: "inherit",
        textDecoration: "none",
        padding: "12px 0",
        borderBottom:
          "1px solid #e5e7eb",
      }}
    >
      <strong
        style={{
          color: "#d7193f",
          fontSize: 20,
          textAlign: "center",
        }}
      >
        {number}
      </strong>

      {story.image_url ? (
        <img
          src={`/api/image?url=${encodeURIComponent(
            story.image_url
          )}`}
          alt={story.title}
          loading="lazy"
          style={{
            width: 80,
            height: 60,
            objectFit: "cover",
            borderRadius: 7,
          }}
        />
      ) : (
        <div
          style={{
            width: 80,
            height: 60,
            background: "#f3f4f6",
            borderRadius: 7,
          }}
        />
      )}

      <div>
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.35,
            fontWeight: 800,
          }}
        >
          {story.title}
        </div>

        <div
          style={{
            color: "#d7193f",
            fontSize: 11,
            fontWeight: 700,
            marginTop: 4,
          }}
        >
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
}: {
  title: string;
  slug?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom:
          "3px solid #d7193f",
        paddingBottom: 9,
        marginBottom: 18,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 26,
          fontWeight: 900,
        }}
      >
        {title}
      </h2>

      {slug && (
        <Link
          href={`/category/${slug}`}
          style={{
            color: "#d7193f",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          View All →
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const { data: latestData } =
    await supabase
      .from("news")
      .select(
        "id,title,slug,content,image_url,category,created_at,view_count"
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

  const { data: mostReadData } =
    await supabase
      .from("news")
      .select(
        "id,title,slug,content,image_url,category,created_at,view_count"
      )
      .eq("Published", true)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .order("view_count", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .limit(6);

  const mostRead =
    (mostReadData || []) as Story[];

  const featured =
    latest[0] || null;

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
            .select(
              "id,title,slug,content,image_url,category,created_at"
            )
            .eq(
              "Published",
              true
            )
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
            .order("created_at", {
              ascending: false,
            })
            .limit(4);

        categoryStories[
          category.slug
        ] = (data || []) as Story[];
      })
  );

  return (
    <>
      {/* HEADER */}
      <header
        style={{
          background: "#d7193f",
          color: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow:
            "0 2px 10px rgba(0,0,0,.12)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#fff",
              textDecoration:
                "none",
              fontSize:
                "clamp(1.4rem,4vw,2rem)",
              fontWeight: 900,
            }}
          >
            JNMulee News
          </Link>

          <Link
            href="/search"
            style={{
              color: "#fff",
              textDecoration:
                "none",
              fontWeight: 700,
            }}
          >
            🔎 Search
          </Link>
        </div>
      </header>

      {/* CATEGORY NAVIGATION */}
      <nav
        style={{
          background: "#fff",
          borderBottom:
            "1px solid #e5e7eb",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "10px 16px",
            display: "flex",
            gap: 18,
            whiteSpace:
              "nowrap",
          }}
        >
          {categories.map(
            (category) => (
              <Link
                key={
                  category.slug
                }
                href={`/category/${category.slug}`}
                style={{
                  color: "#333",
                  textDecoration:
                    "none",
                  fontSize: 13,
                  fontWeight: 750,
                }}
              >
                {category.name}
              </Link>
            )
          )}
        </div>
      </nav>

      {/* BREAKING NEWS */}
      <div
        style={{
          background: "#111827",
          color: "#fff",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "9px 16px",
            display: "flex",
            gap: 12,
            alignItems:
              "center",
          }}
        >
          <strong
            style={{
              background:
                "#d7193f",
              padding:
                "5px 8px",
              borderRadius: 5,
              fontSize: 11,
              whiteSpace:
                "nowrap",
            }}
          >
            BREAKING NEWS
          </strong>

          <span
            style={{
              overflow:
                "hidden",
              textOverflow:
                "ellipsis",
              whiteSpace:
                "nowrap",
              fontSize: 13,
            }}
          >
            {latest[0]?.title ||
              "Latest news and updates from JNMulee News."}
          </span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main
        style={{
          width: "100%",
          maxWidth: 1200,
          minHeight:
            "calc(100vh - 180px)",
          margin: "0 auto",
          padding:
            "24px 16px 60px",
        }}
      >
        {featured && (
          <section
            style={{
              marginBottom: 32,
            }}
          >
            <div
              className="jnmulee-featured"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "2fr 1fr",
                gap: 22,
              }}
            >
              <StoryCard
                story={featured}
                large
              />

              <div
                style={{
                  background: "#fff",
                  border:
                    "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <SectionHeader
                  title="Latest News"
                />

                {latest
                  .slice(1, 5)
                  .map((story) => (
                    <Link
                      key={story.id}
                      href={`/news/${story.slug}`}
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "80px 1fr",
                        gap: 10,
                        textDecoration:
                          "none",
                        color:
                          "inherit",
                        paddingBottom:
                          12,
                        marginBottom:
                          12,
                        borderBottom:
                          "1px solid #eee",
                      }}
                    >
                      {story.image_url && (
                        <img
                          src={`/api/image?url=${encodeURIComponent(
                            story.image_url
                          )}`}
                          alt={
                            story.title
                          }
                          loading="lazy"
                          style={{
                            width: 80,
                            height: 60,
                            objectFit:
                              "cover",
                            borderRadius: 7,
                          }}
                        />
                      )}

                      <div>
                        <div
                          style={{
                            color:
                              "#d7193f",
                            fontSize:
                              11,
                            fontWeight:
                              800,
                          }}
                        >
                          {story.category ||
                            "News"}
                        </div>

                        <div
                          style={{
                            fontSize:
                              14,
                            fontWeight:
                              800,
                            lineHeight:
                              1.35,
                          }}
                        >
                          {story.title}
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* MOST READ */}
        <section
          style={{
            marginBottom: 35,
          }}
        >
          <div
            style={{
              background: "#fff",
              border:
                "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 18,
            }}
          >
            <SectionHeader
              title="🔥 Most Read"
            />

            <p
              style={{
                color: "#6b7280",
                fontSize: 13,
                margin:
                  "-5px 0 8px",
              }}
            >
              Stories getting the
              most views.
            </p>

            {mostRead.length >
            0 ? (
              <div
                className="jnmulee-most-read"
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  columnGap: 25,
                }}
              >
                {mostRead.map(
                  (
                    story,
                    index
                  ) => (
                    <MostReadItem
                      key={
                        story.id
                      }
                      story={story}
                      number={
                        index + 1
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <p
                style={{
                  color:
                    "#777",
                }}
              >
                No view data yet.
              </p>
            )}
          </div>
        </section>

        <div
          style={{
            marginBottom: 35,
          }}
        >
          <DirectAd
            placement="homepage"
          />
        </div>

        {/* LATEST NEWS */}
        <section
          style={{
            marginBottom: 40,
          }}
        >
          <SectionHeader
            title="Latest News"
          />

          <div
            className="jnmulee-news-grid"
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(3,minmax(0,1fr))",
              gap: 20,
            }}
          >
            {latest
              .slice(1)
              .map(
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

        <div
          style={{
            marginBottom: 40,
          }}
        >
          <DirectAd
            placement="home_between"
          />
        </div>

        {/* CATEGORY SECTIONS */}
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
                !stories.length
              ) {
                return null;
              }

              return (
                <section
                  key={
                    category.slug
                  }
                  style={{
                    marginBottom:
                      45,
                  }}
                >
                  <SectionHeader
                    title={
                      category.name
                    }
                    slug={
                      category.slug
                    }
                  />

                  <div
                    className="jnmulee-category-grid"
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(4,minmax(0,1fr))",
                      gap: 18,
                    }}
                  >
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

        <DirectAd
          placement="home_bottom"
        />
      </main>

      {/* NO FOOTER HERE.
          Footer is provided once by app/layout.tsx. */}

      <style>{`
        @media (max-width: 900px) {
          .jnmulee-featured {
            grid-template-columns: 1fr !important;
          }

          .jnmulee-category-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .jnmulee-news-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 600px) {
          .jnmulee-most-read {
            grid-template-columns: 1fr !important;
          }

          .jnmulee-category-grid,
          .jnmulee-news-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}