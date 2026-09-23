import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DirectAd from "@/components/DirectAd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  { name: "Crypto", slug: "crypto" }
];

function cleanText(text: string | null | undefined) {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, "").trim();
}

function shortText(text: string | null | undefined, length = 150) {
  const value = cleanText(text);
  if (value.length <= length) return value;
  return value.slice(0, length).trim() + "...";
}

export default async function HomePage() {
  const { data: stories, error } = await supabase
    .from("news")
    .select(
      "id,title,slug,content,image_url,category,created_at"
    )
    .eq("Published", true)
    .not("image_url", "is", null)
    .neq("image_url", "")
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    return (
      <main className="dashboardPage">
        <section className="section">
          <div className="container">
            <div className="emptyState">
              <h2>Unable to load news</h2>
              <p>Please try again later.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const allStories = stories || [];
  const featured = allStories[0];

  const getCategoryStories = (slug: string) => {
    return allStories
      .filter((story) => {
        const category = (story.category || "").toLowerCase();

        if (slug === "news") {
          return [
            "news",
            "top stories",
            "top story",
            "general"
          ].includes(category);
        }

        if (slug === "sports") {
          return category === "sports" || category === "sport";
        }

        return category === slug;
      })
      .slice(0, 4);
  };

  return (
    <>
      <header className="header">
        <div className="container nav">
          <Link href="/" className="brand">
            JNMulee<span>News</span>
          </Link>

          <nav className="mainNav">
            <Link href="/">Home</Link>

            {categories.slice(1).map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container heroInner">
            <div className="heroCopy">
              <p className="eyebrow">JNMulee News</p>

              <h1>
                News that keeps you
                <br />
                informed.
              </h1>

              <p className="lead">
                Latest news, breaking stories, sports,
                business, technology, entertainment and more.
              </p>
            </div>

            <div className="heroPanel">
              <span>LIVE NEWS</span>
              <strong>
                Fresh stories from Nigeria and around the world.
              </strong>
              <p>
                Stay updated with the latest headlines and
                important stories as they happen.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">

            <div className="categoryBar">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={
                    category.slug === "news"
                      ? "/"
                      : `/category/${category.slug}`
                  }
                  className="categoryPill"
                >
                  {category.name}
                </Link>
              ))}
            </div>

            <DirectAd placement="homepage" />

            {featured && (
              <>
                <div className="sectionTitle">
                  <div>
                    <p className="sectionKicker">
                      Latest
                    </p>
                    <h2>Top Story</h2>
                  </div>
                </div>

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
                      {featured.category || "News"}
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
                      {shortText(featured.content, 220)}
                    </p>

                    <Link
                      href={`/news/${featured.slug}`}
                      className="readMore"
                    >
                      Read full story →
                    </Link>
                  </div>
                </article>
              </>
            )}

            <DirectAd placement="homepage_ads" />

            <div className="latestHeader">
              <h2>Latest News</h2>
              <div className="latestLine" />
            </div>

            <div className="grid">
              {allStories.slice(1, 13).map((story) => (
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

                    <p className="excerpt">
                      {shortText(story.content, 120)}
                    </p>

                    <Link
                      href={`/news/${story.slug}`}
                      className="readMore"
                    >
                      Read story →
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {categories
              .filter((category) => category.slug !== "news")
              .map((category) => {
                const categoryStories =
                  getCategoryStories(category.slug);

                if (categoryStories.length === 0) {
                  return null;
                }

                return (
                  <section
                    className="categorySection"
                    key={category.slug}
                  >
                    <div className="categorySectionHeader">
                      <h2>{category.name}</h2>

                      <Link
                        href={`/category/${category.slug}`}
                        className="viewCategory"
                      >
                        View all →
                      </Link>
                    </div>

                    <div className="categoryGrid">
                      {categoryStories.map((story) => (
                        <article
                          className="categoryCard"
                          key={story.id}
                        >
                          <Link
                            href={`/news/${story.slug}`}
                            className="categoryCardImage"
                          >
                            <img
                              src={story.image_url}
                              alt={story.title}
                            />
                          </Link>

                          <div className="categoryCardBody">
                            <p className="category">
                              {story.category}
                            </p>

                            <h3>
                              <Link
                                href={`/news/${story.slug}`}
                              >
                                {story.title}
                              </Link>
                            </h3>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}

            {!featured && (
              <div className="emptyState">
                <h2>No published stories yet</h2>
                <p>
                  Publish news with an image from the admin
                  dashboard.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}