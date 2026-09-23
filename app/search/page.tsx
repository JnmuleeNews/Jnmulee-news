import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";

  let stories: {
    id: string;
    title: string;
    slug: string;
    content: string | null;
    image_url: string | null;
    category: string | null;
    created_at: string;
  }[] = [];

  if (q) {
    const searchTerm = q.replace(/[%_]/g, "");

    if (searchTerm) {
      const { data, error } = await supabase
        .from("news")
        .select(
          "id,title,slug,content,image_url,category,created_at"
        )
        .eq("Published", true)
        .not("image_url", "is", null)
        .neq("image_url", "")
        .or(
          `title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error) {
        stories = data || [];
      }
    }
  }

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
        <h1>Search JNMulee News</h1>

        <form method="GET" className="searchForm">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search news..."
            aria-label="Search news"
          />

          <button type="submit">
            Search
          </button>
        </form>

        {q && (
          <p className="searchResultText">
            Search results for: <strong>{q}</strong>
          </p>
        )}

        {stories.length > 0 ? (
          <div className="newsGrid">
            {stories.map((story) => (
              <article className="newsCard" key={story.id}>
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
                      {story.category || "News"}
                    </span>

                    <h2>{story.title}</h2>

                    {story.content && (
                      <p>
                        {story.content.slice(0, 160)}
                        {story.content.length > 160 ? "..." : ""}
                      </p>
                    )}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : q ? (
          <div className="emptyState">
            <h2>No results found</h2>
            <p>
              We could not find any published stories matching
              your search.
            </p>
          </div>
        ) : (
          <div className="emptyState">
            <h2>Search JNMulee News</h2>
            <p>
              Enter a keyword above to search published stories.
            </p>
          </div>
        )}
      </div>

      <footer className="siteFooter">
        <div className="container">
          <div className="footerLinks">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy Policy</Link>
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