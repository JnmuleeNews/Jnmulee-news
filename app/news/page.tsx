import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DirectAd from "@/components/DirectAd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news.vercel.app";

export const metadata: Metadata = {
  title: "Latest News",
  description:
    "Latest breaking news, Nigeria news, world news, sports, business, entertainment, technology, politics and more from JNMulee News.",
  alternates: {
    canonical: `${siteUrl}/news`,
  },
  openGraph: {
    title: "Latest News | JNMulee News",
    description:
      "Read the latest news and stories from JNMulee News.",
    url: `${siteUrl}/news`,
    siteName: "JNMulee News",
    type: "website",
  },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Story = {
  id: string | number;
  title: string;
  slug: string | null;
  content: string | null;
  image_url: string | null;
  category: string | null;
  created_at: string;
};

const categories = [
  "All News",
  "Nigeria",
  "World",
  "Politics",
  "Business",
  "Technology",
  "Sports",
  "Entertainment",
  "Gossip",
  "Crypto",
];

function cleanText(value: string | null | undefined) {
  if (!value) return "";

  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(value: string | null | undefined, length = 160) {
  const text = cleanText(value);

  if (!text) return "";

  return text.length > length
    ? `${text.slice(0, length).trim()}...`
    : text;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function articleHref(story: Story) {
  return `/news/${story.slug || story.id}`;
}

function normalizeCategory(category: string | null) {
  if (!category) return "News";

  const value = category.trim();

  if (!value) return "News";

  if (value.toLowerCase() === "sport") return "Sports";

  return value;
}

function StoryImage({
  story,
  large = false,
}: {
  story: Story;
  large?: boolean;
}) {
  if (!story.image_url) {
    return (
      <div
        style={{
          width: "100%",
          height: large ? 320 : 220,
          background:
            "linear-gradient(135deg, #0f172a, #164e63)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#67e8f9",
          fontWeight: 800,
          fontSize: large ? 28 : 20,
        }}
      >
        JNMulee News
      </div>
    );
  }

  return (
    <img
      src={story.image_url}
      alt={story.title}
      loading={large ? "eager" : "lazy"}
      style={{
        width: "100%",
        height: large ? 320 : 220,
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

function NewsCard({ story }: { story: Story }) {
  return (
    <article
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 8px 25px rgba(15, 23, 42, 0.06)",
      }}
    >
      <Link
        href={articleHref(story)}
        style={{
          display: "block",
          color: "inherit",
          textDecoration: "none",
        }}
      >
        <StoryImage story={story} />

        <div style={{ padding: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 10,
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "#0891b2" }}>
              {normalizeCategory(story.category)}
            </span>

            <span style={{ color: "#64748b" }}>
              {formatDate(story.created_at)}
            </span>
          </div>

          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 21,
              lineHeight: 1.25,
              fontWeight: 850,
            }}
          >
            {story.title}
          </h2>

          {story.content && (
            <p
              style={{
                margin: "12px 0 0",
                color: "#475569",
                lineHeight: 1.6,
                fontSize: 15,
              }}
            >
              {excerpt(story.content)}
            </p>
          )}

          <div
            style={{
              marginTop: 14,
              color: "#0891b2",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            Read story →
          </div>
        </div>
      </Link>
    </article>
  );
}

export default async function NewsPage() {
  const { data, error } = await supabase
    .from("news")
    .select(
      "id,title,slug,content,image_url,category,created_at"
    )
    .eq("Published", true)
    .not("image_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const stories = (data || []) as Story[];

  const featured = stories[0] || null;
  const latest = stories.slice(1);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          background: "#020617",
          color: "#cbd5e1",
          padding: "8px 16px",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        JNMulee News — Latest Stories & Breaking News
      </div>

      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: 1250,
            margin: "0 auto",
            padding: "18px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              fontWeight: 950,
              fontSize: 27,
              color: "#0891b2",
            }}
          >
            JNMulee News
          </Link>

          <nav
            style={{
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Link href="/" style={navStyle}>
              Home
            </Link>

            <Link href="/news" style={activeNavStyle}>
              News
            </Link>

            <Link href="/category/sports" style={navStyle}>
              Sports
            </Link>

            <Link href="/category/entertainment" style={navStyle}>
              Entertainment
            </Link>

            <Link href="/category/business" style={navStyle}>
              Business
            </Link>

            <Link href="/category/technology" style={navStyle}>
              Technology
            </Link>

            <Link href="/category/politics" style={navStyle}>
              Politics
            </Link>

            <Link href="/category/crypto" style={navStyle}>
              Crypto
            </Link>
          </nav>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1250,
          margin: "0 auto",
          padding: "30px 16px 70px",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <DirectAd placement="home_top" />
        </div>

        <div style={{ marginBottom: 30 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(34px, 5vw, 52px)",
              lineHeight: 1.05,
              fontWeight: 950,
              letterSpacing: "-1.5px",
            }}
          >
            Latest News
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "#64748b",
              fontSize: 17,
            }}
          >
            Stay updated with the latest stories from JNMulee News.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 25,
              padding: 16,
              borderRadius: 12,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
            }}
          >
            News could not be loaded right now.
          </div>
        )}

        {featured && (
          <section style={{ marginBottom: 35 }}>
            <Link
              href={articleHref(featured)}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1.4fr) minmax(280px, 1fr)",
                background: "#ffffff",
                borderRadius: 20,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                textDecoration: "none",
                color: "inherit",
                boxShadow:
                  "0 15px 45px rgba(15, 23, 42, 0.08)",
              }}
            >
              <StoryImage story={featured} large />

              <div
                style={{
                  padding: 30,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    color: "#0891b2",
                    fontSize: 13,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  {normalizeCategory(featured.category)}
                </div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "clamp(26px, 4vw, 42px)",
                    lineHeight: 1.12,
                    fontWeight: 950,
                  }}
                >
                  {featured.title}
                </h2>

                <p
                  style={{
                    color: "#475569",
                    lineHeight: 1.65,
                    marginTop: 16,
                  }}
                >
                  {excerpt(featured.content, 220)}
                </p>

                <div
                  style={{
                    color: "#0891b2",
                    fontWeight: 900,
                    marginTop: 10,
                  }}
                >
                  Read full story →
                </div>
              </div>
            </Link>
          </section>
        )}

        <section
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 10,
            marginBottom: 30,
          }}
        >
          {categories.map((category) => {
            const href =
              category === "All News"
                ? "/news"
                : `/category/${category
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`;

            return (
              <Link
                key={category}
                href={href}
                style={{
                  flexShrink: 0,
                  padding: "10px 16px",
                  borderRadius: 999,
                  background:
                    category === "All News"
                      ? "#0891b2"
                      : "#ffffff",
                  color:
                    category === "All News"
                      ? "#ffffff"
                      : "#334155",
                  border: "1px solid #cbd5e1",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                {category}
              </Link>
            );
          })}
        </section>

        <div style={{ marginBottom: 30 }}>
          <DirectAd placement="home_between" />
        </div>

        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 15,
              marginBottom: 20,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 950,
              }}
            >
              Latest Stories
            </h2>

            <span
              style={{
                color: "#64748b",
                fontSize: 14,
              }}
            >
              {stories.length} published stories
            </span>
          </div>

          {latest.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 22,
              }}
            >
              {latest.map((story) => (
                <NewsCard key={story.id} story={story} />
              ))}
            </div>
          ) : !featured ? (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 40,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              No published stories with images are available yet.
            </div>
          ) : null}
        </section>

        <div style={{ marginTop: 40 }}>
          <DirectAd placement="home_bottom" />
        </div>
      </div>

      <footer
        style={{
          background: "#020617",
          color: "#cbd5e1",
          padding: "35px 16px",
        }}
      >
        <div
          style={{
            maxWidth: 1250,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#67e8f9",
                fontWeight: 950,
                fontSize: 22,
              }}
            >
              JNMulee News
            </div>

            <p
              style={{
                margin: "8px 0 0",
                color: "#94a3b8",
              }}
            >
              News that keeps you informed.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <Link href="/about" style={footerLink}>
              About
            </Link>

            <Link href="/contact" style={footerLink}>
              Contact
            </Link>

            <Link href="/privacy" style={footerLink}>
              Privacy
            </Link>

            <Link href="/terms" style={footerLink}>
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

const navStyle = {
  color: "#475569",
  textDecoration: "none",
  fontWeight: 750,
  fontSize: 14,
};

const activeNavStyle = {
  color: "#0891b2",
  textDecoration: "none",
  fontWeight: 900,
  fontSize: 14,
};

const footerLink = {
  color: "#cbd5e1",
  textDecoration: "none",
  fontSize: 14,
};