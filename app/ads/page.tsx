import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 60;

export default async function AdsPage() {
  const { data: ads, error } = await supabase
    .from("direct_ads")
    .select(
      "id, title, image_url, link_url, placement, created_at"
    )
    .in("placement", ["ads_page", "homepage_ads"])
    .eq("active", true)
    .or("starts_at.is.null,starts_at.lte.now()")
    .or("ends_at.is.null,ends_at.gte.now()")
    .order("created_at", { ascending: false });

  return (
    <main>
      <header className="header">
        <div className="container nav">
          <Link className="brand" href="/">
            JNMulee <span>News</span>
          </Link>

          <nav className="mainNav" aria-label="Main navigation">
            <Link href="/">
              Home
            </Link>

            <Link href="/category/news">
              News
            </Link>

            <Link href="/category/sport">
              Sport
            </Link>

            <Link href="/category/entertainment">
              Entertainment
            </Link>

            <Link href="/category/gossip">
              Gossip
            </Link>

            <Link href="/category/business">
              Business
            </Link>

            <Link href="/category/crypto">
              Crypto
            </Link>

            <Link
              href="/ads"
              className="active"
            >
              Ads
            </Link>
          </nav>
        </div>
      </header>

      <section className="container section">
        <p className="eyebrow">
          JNMulee News
        </p>

        <div className="sectionTitle">
          <div>
            <p className="sectionKicker">
              ADVERTISEMENTS
            </p>

            <h1>
              Advertisements
            </h1>
          </div>
        </div>

        <p className="categoryDescription">
          Discover advertisements and businesses featured
          on JNMulee News.
        </p>

        {error ? (
          <div className="emptyState">
            <h2>
              Unable to load advertisements
            </h2>

            <p>
              Please try again shortly.
            </p>
          </div>
        ) : !ads || ads.length === 0 ? (
          <div className="emptyState">
            <h2>
              No advertisements available
            </h2>

            <p>
              Advertisements will appear here when they
              are added.
            </p>
          </div>
        ) : (
          <div className="grid">
            {ads.map((ad) => (
              <article
                className="card"
                key={ad.id}
              >
                <a
                  href={ad.link_url}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="cardImage"
                >
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                  />
                </a>

                <div className="cardBody">
                  <p className="category">
                    Advertisement
                  </p>

                  <h3>
                    <a
                      href={ad.link_url}
                      target="_blank"
                      rel="sponsored noopener noreferrer"
                    >
                      {ad.title}
                    </a>
                  </h3>

                  <a
                    href={ad.link_url}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    className="readMore"
                  >
                    View Advertisement →
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}