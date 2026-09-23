import Link from "next/link";
import Image from "next/image";
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
  { name: "Sports", slug: "sport" },
  { name: "Entertainment", slug: "entertainment" },
  { name: "Gossip", slug: "gossip" },
  { name: "Business", slug: "business" },
  { name: "Crypto", slug: "crypto" },
];

export default async function HomePage() {
  const { data: stories } = await supabase
    .from("news")
    .select(
      "id,title,slug,content,image_url,Published,source_url,category,created_at"
    )
    .eq("Published", true)
    .not("image_url", "is", null)
    .neq("image_url", "")
    .order("created_at", { ascending: false })
    .limit(30);

  const posts = stories || [];

  return (
    <main>
      <header className="siteHeader">
        <div className="container headerInner">
          <Link href="/" className="logo">
            JNMulee News
          </Link>

          <nav>
            <Link href="/">Home</Link>
            <Link href="/search">Search</Link>
            {categories.map((category) => (
              <Link key={category.slug} href={`/category/${category.slug}`}>
                {category.name}
              </Link>
            ))}
            <Link href="/ads">Ads</Link>
          </nav>
        </div>
      </header>

      <div className="container">
        <DirectAd slot="home_top" />

        <section className="heroSection">
          <h1>Latest News</h1>

          {posts.length === 0 ? (
            <div className="emptyState">
              <h2>No published stories yet</h2>
              <p>New stories will appear here when they have images.</p>
            </div>
          ) : (
            <div className="newsGrid">
              {posts.map((story) => (
                <article className="newsCard" key={story.id}>
                  <Link href={`/news/${story.slug}`}>
                    <div className="newsImage">
                      <Image
                        src={story.image_url!}
                        alt={story.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>

                    <div className="newsCardBody">
                      <span className="categoryLabel">
                        {story.category}
                      </span>

                      <h2>{story.title}</h2>

                      <p>
                        {story.content?.slice(0, 150)}
                        {story.content?.length > 150 ? "..." : ""}
                      </p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <DirectAd slot="home_between" />

        <section className="categoryLinks">
          <h2>Explore JNMulee News</h2>

          <div className="categoryGrid">
            {categories.map((category) => (
              <Link
                href={`/category/${category.slug}`}
                className="categoryBox"
                key={category.slug}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>

        <DirectAd slot="home_bottom" />
      </div>

      <footer className="siteFooter">
        <div className="container">
          <div className="footerLinks">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms</Link>
          </div>

          <p>© {new Date().getFullYear()} JNMulee News</p>
        </div>
      </footer>
    </main>
  );
}