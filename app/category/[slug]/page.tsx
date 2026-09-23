import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Props = {
  params: Promise<{ slug: string }>;
};

const categories = [
  "News",
  "Sport",
  "Entertainment",
  "Gossip",
  "Business",
  "Crypto",
];

function cleanText(html: string | null) {
  if (!html) return "";

  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getCategoryName(slug: string) {
  return categories.find(
    (category) => category.toLowerCase() === slug.toLowerCase()
  );
}

export const revalidate = 60;

export default async function Category({ params }: Props) {
  const { slug } = await params;

  const categoryName = getCategoryName(slug);

  if (!categoryName) {
    notFound();
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: posts, error } = await supabase
    .from("news")
    .select(
      "id, title, slug, content, image_url, category, created_at"
    )
    .eq("Published", true)
    .ilike("category", categoryName)
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

        <h1>{categoryName} News</h1>

        <p className="lead">
          Latest {categoryName.toLowerCase()} news and stories from JNMulee
          News.
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
          {categories.map((category) => {
            const active =
              category.toLowerCase() === categoryName.toLowerCase();

            return (
              <Link
                key={category}
                href={`/category/${category.toLowerCase()}`}
                style={{
                  padding: "9px 15px",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: 700,
                  background: active ? "#111" : "#f1f1f1",
                  color: active ? "#fff" : "#111",
                }}
              >
                {category}
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
            <h2>No {categoryName} news yet</h2>
            <p>
              New {categoryName.toLowerCase()} stories will appear here when
              they are published.
            </p>
          </div>
        ) : (
          <div className="newsGrid">
            {posts.map((post) => {
              const text = cleanText(post.content);

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
                      className="cardImage placeholderImage"
                    >
                      JNMulee News
                    </Link>
                  )}

                  <div className="cardBody">
                    <p className="cardCategory">
                      {post.category || categoryName}
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