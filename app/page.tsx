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
    .select(
      "id, title, slug, content, image_url, category, created_at"
    )
    .eq("Published", true)
    .order("created_at", { ascending: false })
    .limit(40);

  const stories = news ?? [];
  const featured = stories[0];
  const latest = stories.slice(1, 13);

  const getCategoryStories = (category: string) =>
    stories
      .filter(
        (story) =>
          story.category?.toLowerCase() === category.toLowerCase()
      )
      .slice(0, 4);

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
            <p className="eyebrow">JNMule