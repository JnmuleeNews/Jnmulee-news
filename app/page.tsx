import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 60;

export default async function Home() {
  const { data: news, error } = await supabase
    .from("news")
    .select("id, title, slug, content, image_url, category, created_at")
    .eq("Published", true)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main>
      <header className="header">
        <div className="container nav">
          <Link className="brand" href="/">
            JNMulee <span>News</span>
          </Link>

          <nav>
            <Link href="/">Home</Link>
            <Link href="/category/world">World</Link>
            <Link href="/category/business">Business</Link>
            <Link href="/category/technology">Technology</Link>
            <Link href="/admin/login">Admin</Link>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <p className="eyebrow">JNMulee News</p>
          <h1>News that keeps you informed.</h1>
          <p className="lead">
            Fast, readable coverage across world news, business,
            technology and more.
          </p>

          <div className="search">
            <input placeholder="Search JNMulee News..." />
            <button type="button">Search</button>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="sectionTitle">
          <h2>Latest stories</h2>
          <span>Updated regularly</span>
        </div>

        {error ? (
          <p>Unable to load news right now.</p>
        ) : !news || news.length === 0 ? (
          <p>No news articles available yet.</p>
        ) : (
          <div className="grid">
            {news.map((story, i) => (
              <article
                className={i === 0 ? "card featured" : "card"}
                key={story.id}
              >
                {story.image_url ? (
                  <img
                    src={story.image_url}
                    alt={story.title}
                    style={{
                      width: "100%",
                      height: 220,
                      objectFit: "cover",
                      borderRadius: 12,
                    }}
                  />
                ) : (
                  <div className="placeholder">JNMulee News</div>
                )}

                <p className="category">{story.category}</p>

                <h3>
                  <Link href={`/news/${story.slug}`}>
                    {story.title}
                  </Link>
                </h3>

                <p>
                  {story.content
                    ? story.content.substring(0, 180)
                    : "Read the latest story from JNMulee News."}
                  ...
                </p>

                <small>
                  <Link href={`/news/${story.slug}`}>
                    Read more →
                  </Link>
                </small>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer>
        <div className="container">
          © {new Date().getFullYear()} JNMulee News. All rights reserved.
        </div>
      </footer>
    </main>
  );
}