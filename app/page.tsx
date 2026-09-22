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

  const featured = news?.[0];
  const latest = news?.slice(1) ?? [];

  return (
    <main>
      <header className="header">
        <div className="container nav">
          <Link className="brand" href="/">
            JNMulee <span>News</span>
          </Link>

          <nav className="mainNav" aria-label="Main navigation">
            <Link className="active" href="/">
              Home
            </Link>
            <Link href="/category/world">World</Link>
            <Link href="/category/business">Business</Link>
            <Link href="/category/technology">Technology</Link>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container heroInner">
          <div className="heroCopy">
            <p className="eyebrow">JNMulee News</p>

            <h1>
              Stay informed.
              <br />
              <span>Know what matters.</span>
            </h1>

            <p className="lead">
              Breaking stories, world news, business and technology —
              presented clearly and updated regularly.
            </p>
          </div>

          <div className="heroPanel">
            <span>NEWSROOM</span>

            <strong>Latest stories, all in one place.</strong>

            <p>
              Follow the stories shaping conversations around the world.
            </p>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="sectionTitle">
          <div>
            <p className="sectionKicker">TOP STORIES</p>
            <h2>What’s happening now</h2>
          </div>

          <span className="updated">Updated regularly</span>
        </div>

        {error ? (
          <div className="emptyState">
            Unable to load news right now.
          </div>
        ) : !news || news.length === 0 ? (
          <div className="emptyState">
            No news articles available yet.
          </div>
        ) : (
          <>
            {featured && (
              <article className="featuredStory">
                <Link
                  href={`/news/${featured.slug}`}
                  className="featuredImage"
                >
                  <img
                    src={featured.image_url}
                    alt={featured.title}
                  />

                  <span className="imageBadge">
                    Top Story
                  </span>
                </Link>

                <div className="featuredContent">
                  <p className="category">
                    {featured.category || "News"}
                  </p>

                  <h3>
                    <Link href={`/news/${featured.slug}`}>
                      {featured.title}
                    </Link>
                  </h3>

                  <p className="excerpt">
                    {featured.content
                      ? featured.content.substring(0, 260)
                      : "Read the latest story from JNMulee News."}
                    …
                  </p>

                  <Link
                    className="readMore"
                    href={`/news/${featured.slug}`}
                  >
                    Read full story <span>→</span>
                  </Link>
                </div>
              </article>
            )}

            <div className="latestHeader">
              <h2>Latest News</h2>
              <div className="latestLine" />
            </div>

            <div className="grid">
              {latest.map((story) => (
                <article className="card" key={story.id}>
                  <Link
                    href={`/news/${story.slug}`}
                    className="cardImage"
                  >
                    <img
                      src={story.image_url}
                      alt={story.title}
                    />
                  </Link>

                  <div className="cardBody">
                    <p className="category">
                      {story.category || "News"}
                    </p>

                    <h3>
                      <Link href={`/news/${story.slug}`}>
                        {story.title}
                      </Link>
                    </h3>

                    <p className="cardExcerpt">
                      {story.content
                        ? story.content.substring(0, 120)
                        : "Read the latest story from JNMulee News."}
                      …
                    </p>

                    <Link
                      className="readMore"
                      href={`/news/${story.slug}`}
                    >
                      Read more <span>→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <footer>
        <div className="container footerInner">
          <div>
            <Link
              className="brand footerBrand"
              href="/"
            >
              JNMulee <span>News</span>
            </Link>

            <p>News that keeps you informed.</p>
          </div>

          <div className="footerLinks">
            <Link href="/category/world">World</Link>
            <Link href="/category/business">Business</Link>
            <Link href="/category/technology">
              Technology
            </Link>
          </div>

          <small>
            © {new Date().getFullYear()} JNMulee News. All rights reserved.
          </small>
        </div>
      </footer>
    </main>
  );
}