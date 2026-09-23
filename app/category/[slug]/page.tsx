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

  const slugKey = slug.toLowerCase();
  const databaseCategory = categoryMap[slugKey];

  if (!databaseCategory) {
    notFound();
  }

  const displayCategory =
    categoryLinks.find(
      (category) => category.slug === slugKey
    )?.name || databaseCategory;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /*
   * IMPORTANT:
   * The Supabase news table does NOT have a description column
   * or a published_at column.
   *
   * The real columns are:
   * id
   * title
   * slug
   * content
   * image_url
   * Published
   * source_url
   * category
   * created_at
   */

  const { data: posts, error } = await supabase
    .from("news")
    .select(
      "id, title, slug, content, image_url, category, created_at"
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

          <nav className="mainNav">
            <Link href="/">Home</Link>

            {categoryLinks.map((category) => {
              const active =
                category.slug === slugKey ||
                (category.slug === "sport" &&
                  slugKey === "sports");

              return (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className={active ? "active" : ""}
                >
                  {category.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <section className="container section">
        <p className="eyebrow">Category</p>

        <div className="sectionTitle">
          <div>
            <p className="sectionKicker">
              JNMULEE NEWS
            </p>

            <h1>
              {displayCategory} News
            </h1>
          </div>
        </div>

        <p className="categoryDescription">
          Latest {displayCategory.toLowerCase()} news and
          stories from JNMulee News.
        </p>

        <nav className="categoryNav">
          {categoryLinks.map((category) => {
            const active =
              category.slug === slugKey ||
              (category.slug === "sport" &&
                slugKey === "sports");

            return (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className={
                  active
                    ? "categoryNavLink active"
                    : "categoryNavLink"
                }
              >
                {category.name}
              </Link>
            );
          })}
        </nav>

        {error ? (
          <div className="emptyState">
            <h2>Unable to load this category</h2>

            <p>
              There was a problem loading the latest
              {displayCategory.toLowerCase()} stories.
              Please try again shortly.
            </p>
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="emptyState">
            <h2>
              No {displayCategory} news yet
            </h2>

            <p>
              New {displayCategory.toLowerCase()} stories
              will appear here when they are published.
            </p>
          </div>
        ) : (
          <div className="grid">
            {posts.map((post) => {
              const text = cleanText(
                post.content || ""
              );

              return (
                <article
                  className="card"
                  key={post.id}
                >
                  {post.image_url ? (
                    <Link
                      href={`/news/${post.slug}`}
                      className="cardImage"
                    >
                      <img
                        src={post.image_url}
                        alt={post.title}
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
                      {post.category ||
                        displayCategory}
                    </p>

                    <h3>
                      <Link
                        href={`/news/${post.slug}`}
                      >
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