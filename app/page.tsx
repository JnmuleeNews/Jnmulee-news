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
        boxShadow:
          "0 2px 8px rgba(0,0,0,.05)",
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
            src={story.image_url}
            alt={story.title}
            loading={
              large ? "eager" : "lazy"
            }
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
              {excerpt(
                story.content,
                180
              )}
            </p>
          )}

          <time
            style={{
              color: "#6b7280",
              fontSize: 12,
            }}
          >
            {dateText(
              story.created_at
            )}
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
          src={story.image_url}
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
        justifyContent:
          "space-between",
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

  return (
    <>
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
              textDecoration: "none",
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
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            🔎 Search
          </Link>
        </div>
      </header>

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
            whiteSpace: "nowrap",
          }}
        >
          {categories.map(
            (category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                style={{
                  color: "#333",
                  textDecoration:
                    "none",
                  fontSize: 