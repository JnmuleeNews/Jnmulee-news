import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DirectAd from "@/components/DirectAd";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 60;

const categories = [
  { name: "News", slug: "news" },
  { name: "Sport", slug: "sport" },
  { name: "Entertainment", slug: "entertainment" },
  { name: "Gossip", slug: "gossip" },
  { name: "Business", slug: "business" },
  { name: "Crypto", slug: "crypto" },
];

export default async function Home() {
  const { data: news, error } = await supabase
    .from("news")
    .select("id, title, slug, content, image_url, category, created_at")
    .eq("Published", true)
    .order("created_at", { ascending: false })
    .limit(40);

  const featured = news?.[0];
  const latest = news?.slice(1, 13) ?? [];

  const getCategoryStories = (category: string) =>
    news
      ?.filter(
        (story) =>
          story.category?.toLowerCase() === category.toLowerCase()
      )
      .slice(0, 4) ?? [];

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

            {categories.map((category) => (
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

      <DirectAd placement="home_top" />

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
              News, sport, entertainment, gossip, business and crypto —
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
        <div className="categoryBar">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="categoryPill"
            >
              {category.name}
            </Link>
          ))}
        </div>

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
                  {featured.image_url ? (
                    <img
                      src={featured.image_url}
                      alt={featured.title}
                    />
                  ) : (
                    <div className="imagePlaceholder">
                      JNMulee News
                    </div>
                  )}

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

            <DirectAd placement="home_between" />

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
                    {story.image_url ? (
                      <img
                        src={story.image_url}
                        alt={story.title}
                      />
                    ) : (
                     