import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Props = {
  params: Promise<{ slug: string }>;
};

const categoryMap: Record<string, string> = {
  news: "Top Stories",
  sport: "Sports",
  sports: "Sports",
  entertainment: "Entertainment",
  gossip: "Gossip",
  business: "Business",
  crypto: "Crypto",
};

const categoryLinks = [
  { slug: "news", name: "News" },
  { slug: "sport", name: "Sport" },
  { slug: "entertainment", name: "Entertainment" },
  { slug: "gossip", name: "Gossip" },
  { slug: "business", name: "Business" },
  { slug: "crypto", name: "Crypto" },
];

function cleanText(value: string | null) {
  if (!value) return "";

  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export const revalidate = 60;

export default async function Category({ params }: Props) {
  const { slug } = await params;

  const databaseCategory = categoryMap[slug.toLowerCase()];

  if (!databaseCategory) {
    notFound();
  }

  const displayCategory =
    categoryLinks.find(
      (category) => category.slug === slug.toLowerCase()
    )?.name || databaseCategory;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: posts, error } = await supabase
    .from("news")
    .select(
      "id, title, slug, content, description, image_url, category, created_at, published_at"
    )
    .eq("Published", true)
    .eq("category", databaseCategory)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Category query error:", error);
  }

  return (
    <main>
      <header className="header">
        <div className="container nav">
          <Link className="brand" href="/">
            JNMulee <span>News</span>
          </Link>

          <Link href="/">⌂ Home</Link>
        </div>
      </header>

      <section className="container section">
        <p className="eyebrow">Category</p>

        <h1>{displayCategory} News</h1>

        <p className="lead">
          Latest {displayCategory.toLowerCase()} news and stories from
          JNMulee News.
        </p>

        <nav
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 24,
            marginBottom: 30,
          }}
        >
          {categoryLinks.map((category) => {
            const active =
              category.slug === slug.toLowerCase() ||
              (category.slug === "sport" &&
                slug.toLowerCase() === "sports");

            return (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                style={{
                  padding: "9px 15px",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: 700,
                  background: active ? "#111" : "#f1f1f1",
                  color: active ? "#fff" : "#111",
                }}
              >
                {category.name}
              </Link>
            );
          })}
        </nav>

        {!posts || posts.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              border: "1px solid #e5e5e5",
              borderRadius: 16,
            }}
          >
            <h2>No {displayCategory} news yet</h2>

            <p>
              New {displayCategory.toLowerCase()} stories will appear here
              when they are published.
            </p>
          </div>
        ) : (
          <div className="grid">
            {posts.map((post) => {
              const text = cleanText(
                post.description || post.content || ""
              );

              return (
                <article className="card" key={post.id}>
                  {post.image_url ? (
                    <Link href={`/news/${post.slug}`}>
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="cardImage"
                      />
                    </Link>
                  ) : (
                    <Link
                      href={`/news/${post.slug}`}
                      className="cardImage imagePlaceholder"
                    >
                      JNMulee News
                    </Link>
                  )}

                  <div className="cardBody">
                    <p className="category">
                      {post.category || displayCategory}
                    </p>

                    <h3>
                      <Link href={`/news/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h3>

                    {text && (
                      <p className="excerpt">
                        {text.length > 150
                          ? `${text.slice(0, 150)}...`
                          : text}
                      </p>
                    )}

                    <Link
                      href={`/news/${post.slug}`}
                      className="readMore"
                    >
                      Read More →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}