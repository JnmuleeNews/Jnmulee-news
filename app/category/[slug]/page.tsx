import Link from "next/link";
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
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f5f6f8;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
        }

        a {
          text-decoration: none;
          color: inherit;
        }

        .jnm-header {
          background: #b00020;
          color: white;
          width: 100%;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
        }

        .jnm-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .jnm-logo {
          font-size: 25px;
          font-weight: 800;
          color: white;
          white-space: nowrap;
        }

        .jnm-nav {
          display: flex;
          align-items: center;
          gap: 18px;
          overflow-x: auto;
          white-space: nowrap;
          scrollbar-width: none;
        }

        .jnm-nav::-webkit-scrollbar {
          display: none;
        }

        .jnm-nav a {
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .jnm-nav a:hover {
          opacity: 0.8;
        }

        .jnm-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 30px 20px 60px;
        }

        .jnm-category-header {
          margin-bottom: 25px;
        }

        .jnm-category-header h1 {
          margin: 0;
          font-size: 38px;
          line-height: 1.15;
          font-weight: 800;
          color: #111827;
        }

        .jnm-category-line {
          width: 70px;
          height: 5px;
          background: #b00020;
          margin-top: 12px;
          border-radius: 4px;
        }

        .jnm-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }

        .jnm-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          box-shadow: 0 3px 12px rgba(0,0,0,0.07);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .jnm-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 22px rgba(0,0,0,0.12);
        }

        .jnm-image {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #e5e7eb;
          overflow: hidden;
        }

        .jnm-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .jnm-card-body {
          padding: 17px;
        }

        .jnm-category {
          display: inline-block;
          color: #b00020;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .jnm-card h2 {
          margin: 0;
          font-size: 21px;
          line-height: 1.28;
          font-weight: 800;
          color: #111827;
        }

        .jnm-excerpt {
          margin: 11px 0 0;
          color: #5b6472;
          font-size: 15px;
          line-height: 1.55;
        }

        .jnm-empty {
          background: white;
          border-radius: 12px;
          padding: 50px 25px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }

        .jnm-empty h2 {
          margin: 0 0 8px;
          font-size: 24px;
        }

        .jnm-empty p {
          margin: 0;
          color: #6b7280;
        }

        .jnm-footer {
          background: #111827;
          color: white;
          padding: 35px 20px;
        }

        .jnm-footer-inner {
          max-width: 1200px;
          margin: 0 auto;
        }

        .jnm-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 18px;
        }

        .jnm-footer-links a {
          color: white;
          font-size: 14px;
        }

        .jnm-footer p {
          margin: 0;
          color: #cbd5e1;
          font-size: 14px;
        }

        @media (max-width: 900px) {
          .jnm-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .jnm-header-inner {
            align-items: flex-start;
            flex-direction: column;
          }

          .jnm-nav {
            width: 100%;
          }
        }

        @media (max-width: 600px) {
          .jnm-header-inner {
            padding: 14px 15px;
            gap: 12px;
          }

          .jnm-logo {
            font-size: 22px;
          }

          .jnm-nav {
            gap: 15px;
          }

          .jnm-nav a {
            font-size: 13px;
          }

          .jnm-container {
            padding: 22px 14px 45px;
          }

          .jnm-category-header h1 {
            font-size: 31px;
          }

          .jnm-grid {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .jnm-card h2 {
            font-size: 20px;
          }

          .jnm-excerpt {
            font-size: 14px;
          }

          .jnm-footer {
            padding: 28px 15px;
          }
        }
      `}</style>

      <header className="jnm-header">
        <div className="jnm-header-inner">
          <Link href="/" className="jnm-logo">
            JNMulee News
          </Link>

          <nav className="jnm-nav">
            <Link href="/">Home</Link>
            <Link href="/category/news">News</Link>
            <Link href="/category/sport">Sports</Link>
            <Link href="/category/entertainment">
              Entertainment
            </Link>
            <Link href="/category/gossip">
              Gossip
            </Link>
            <Link href="/category/business">
              Business
            </Link>
            <Link href="/category/technology">
              Technology
            </Link>
            <Link href="/category/crypto">
              Crypto
            </Link>
          </nav>
        </div>
      </header>

      <main className="jnm-container">
        <div className="jnm-category-header">
          <h1>{categoryName}</h1>
          <div className="jnm-category-line" />
        </div>

        {error ? (
          <div className="jnm-empty">
            <h2>Unable to load stories</h2>
            <p>
              There was a problem loading this category.
            </p>
          </div>
        ) : stories && stories.length > 0 ? (
          <div className="jnm-grid">
            {stories.map((story) => (
              <article
                className="jnm-card"
                key={story.id}
              >
                <Link href={`/news/${story.slug}`}>
                  {story.image_url && (
                    <div className="jnm-image">
                      <img
                        src={`/api/image?url=${encodeURIComponent(
                          story.image_url
                        )}`}
                        alt={story.title}
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="jnm-card-body">
                    <span className="jnm-category">
                      {story.category || categoryName}
                    </span>

                    <h2>{story.title}</h2>

                    {story.content && (
                      <p className="jnm-excerpt">
                        {story.content.slice(0, 180)}
                        {story.content.length > 180
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
          <div className="jnm-empty">
            <h2>No stories yet</h2>
            <p>
              There are currently no published stories in
              this category.
            </p>
          </div>
        )}
      </main>

      <footer className="jnm-footer">
        <div className="jnm-footer-inner">
          <div className="jnm-footer-links">
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
    </>
  );
}