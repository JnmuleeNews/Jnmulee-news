import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATEGORY_NAMES: Record<string, string> = {
  news: "Top Stories",
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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const categoryName =
    CATEGORY_NAMES[slug.toLowerCase()] || slug;

  const { data: stories, error } = await supabase
    .from("news")
    .select(
      "id,title,slug,content,image_url,category,created_at"
    )
    .eq("Published", true)
    .not("image_url", "is", null)
    .neq("image_url", "")
    .eq("category", categoryName)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main>
      <header className="siteHeader">
        <div className="container headerInner">
          <Link href="/" className="logo">
            JNMulee News
          </Link>

          <nav>
            <Link href="/">Home</Link>
            <Link href="/category/news">News</Link>
            <Link href="/category/sport">Sports</Link>
            <Link href="/category/entertainment">
              Entertainment
            </Link>
            <Link href="/category/gossip">Gossip</Link>
            <Link href="/category/business">Business</Link>
            <Link href="/category/crypto">Crypto</Link>
          </nav>
        </div>
      </header>

      <div className="container pageContainer">
        <h1>{categoryName}</h1>

        {error ? (
          <div className="emptyState">
            <h2>Unable to load stories</h2>
            <p>
              There was a problem loading this category.
            </p>
          </div>
        ) : stories && stories.length > 0 ? (
          <div className="newsGrid">
            {stories.map((story) => (
              <article
                className="newsCard"
                key={story.id}
              >
                <Link href={`/news/${story.slug}`}>
                  {story.image_url && (
                    <div className="newsImage">
                      <Image
                        src={story.image_url}
                        alt={story.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}

                  <div className="newsCardBody">
                    <span className="categoryLabel">
                      {story.category || categoryName}
                    </span>

                    <h2>{story.title}</h2>

                    {story.content && (
                      <p>
                        {story.content.slice(0, 160)}
                        {story.content.length > 160
                          ? "..."
                          : ""}
                      </p>
                    )}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <h2>No stories yet</h2>
            <p>
              There are currently no published stories in
              this category.
            </p>
          </div>
        )}
      </div>

      <footer className="siteFooter">
        <div className="container">
          <div className="footerLinks">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">
              Privacy Policy
            </Link>
            <Link href="/terms">Terms</Link>
          </div>

          <p>
            © {new Date().getFullYear()} JNMulee News
          </p>
        </div>
      </footer>
    </main>
  );
}