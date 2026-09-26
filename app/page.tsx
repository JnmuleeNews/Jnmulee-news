import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DirectAd from "@/components/DirectAd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news-jnnation.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "JNMulee News — Latest Nigerian & World News",
  description:
    "Latest Nigerian, African and world news covering politics, business, technology, sports, entertainment, gossip and crypto.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "JNMulee News",
    description:
      "Latest Nigerian, African and world news covering politics, business, technology, sports, entertainment, gossip and crypto.",
    url: siteUrl,
    siteName: "JNMulee News",
    type: "website",
  },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Story = {
  id: string;
  title: string;
  slug: string | null;
  content: string | null;
  image_url: string | null;
  category: string | null;
  created_at: string;
  view_count?: number | null;
};

const categories = [
  { name: "Nigeria", slug: "nigeria" },
  { name: "World", slug: "world" },
  { name: "Politics", slug: "politics" },
  { name: "Business", slug: "business" },
  { name: "Technology", slug: "technology" },
  { name: "Sports", slug: "sports" },
  { name: "Entertainment", slug: "entertainment" },
  { name: "Gossip", slug: "gossip" },
  { name: "Crypto", slug: "crypto" },
];

function cleanText(text: string | null | undefined) {
  if (!text) return "";

  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(text: string | null | undefined, length = 145) {
  const clean = cleanText(text);

  if (!clean) {
    return "Read the latest story and updates from JNMulee News.";
  }

  if (clean.length <= length) return clean;

  return clean.slice(0, length).trimEnd() + "…";
}

function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "";
  }
}

function formatViews(value: number | null | undefined) {
  const views = Number(value || 0);

  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M`;
  }

  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1)}K`;
  }

  return views.toString();
}

function categorySlug(category: string | null | undefined) {
  return (category || "news")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

function articleHref(story: Story) {
  if (story.slug) {
    return `/news/${story.slug}`;
  }

  return `/news/${story.id}`;
}

function normalizeCategory(category: string | null | undefined) {
  return (category || "").toLowerCase().trim();
}

function categoryMatches(
  story: Story,
  category: { name: string; slug: string }
) {
  const current = normalizeCategory(story.category);

  return current === category.slug || current === category.name.toLowerCase();
}

function StoryImage({
  story,
  className = "",
}: {
  story: Story;
  className?: string;
}) {
  if (!story.image_url) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-slate-200 text-slate-500 ${className}`}
      >
        <span className="text-sm font-semibold">JNMulee News</span>
      </div>
    );
  }

  return (
    <img
      src={story.image_url}
      alt={story.title}
      loading="lazy"
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

function SectionTitle({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3">
      <div className="flex items-center gap-3">
        <span className="h-7 w-1 rounded-full bg-red-600" />
        <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
          {title}
        </h2>
      </div>

      {href && (
        <Link
          href={href}
          className="text-sm font-bold text-red-600 hover:text-red-700"
        >
          View all →
        </Link>
      )}
    </div>
  );
}

function SmallStoryCard({ story }: { story: Story }) {
  return (
    <Link
      href={articleHref(story)}
      className="group flex gap-3 border-b border-slate-200 py-3 last:border-0"
    >
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-200">
        <StoryImage
          story={story}
          className="transition duration-300 group-hover:scale-105"
        />
      </div>

      <div className="min-w-0">
        <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-red-600">
          {story.category || "News"}
        </div>

        <h3 className="line-clamp-3 text-sm font-bold leading-snug text-slate-900 group-hover:text-red-600">
          {story.title}
        </h3>
      </div>
    </Link>
  );
}

function StoryCard({ story }: { story: Story }) {
  return (
    <Link
      href={articleHref(story)}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
        <StoryImage
          story={story}
          className="transition duration-500 group-hover:scale-105"
        />

        <div className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow">
          {story.category || "News"}
        </div>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-3 text-base font-extrabold leading-snug text-slate-950 group-hover:text-red-600">
          {story.title}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
          {excerpt(story.content, 120)}
        </p>

        <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span>{formatDate(story.created_at)}</span>

          {story.view_count ? (
            <span>{formatViews(story.view_count)} views</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function NumberedStory({
  story,
  number,
}: {
  story: Story;
  number: number;
}) {
  return (
    <Link
      href={articleHref(story)}
      className="group flex gap-4 border-b border-slate-200 py-4 last:border-0"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
        {number}
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-3 text-sm font-bold leading-5 text-slate-900 group-hover:text-red-600">
          {story.title}
        </h3>

        <div className="mt-1 text-[11px] text-slate-500">
          {formatViews(story.view_count)} views
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const storySelect =
    "id,title,slug,content,image_url,category,created_at,view_count";

  const [
    latestResult,
    mostReadResult,
  ] = await Promise.all([
    supabase
      .from("news")
      .select(storySelect)
      .eq("Published", true)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("news")
      .select(storySelect)
      .eq("Published", true)
      .order("view_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const latest = (latestResult.data || []) as Story[];
  const mostRead = (mostReadResult.data || []) as Story[];

  const featured = latest[0] || null;
  const secondaryStories = latest.slice(1, 5);

  const trending = latest
    .filter((story) => story.id !== featured?.id)
    .slice(0, 6);

  const latestNews = latest.slice(5, 17);

  const heroCategory = featured
    ? categorySlug(featured.category)
    : "news";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      {/* TOP NEWS BAR */}
      <div className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-4 py-2 text-xs sm:px-6 lg:px-8">
          <span className="shrink-0 rounded bg-red-600 px-2 py-1 font-black uppercase">
            Latest
          </span>

          <div className="truncate font-medium text-slate-200">
            JNMulee News — Latest Nigerian, African and world news
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="shrink-0">
            <div className="text-2xl font-black tracking-tight sm:text-3xl">
              JNMulee<span className="text-red-600">.</span>
            </div>

            <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
              News
            </div>
          </Link>

          <div className="hidden text-center md:block">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Nigeria • Africa • World
            </div>

            <div className="mt-1 text-sm font-semibold text-slate-700">
              Your daily source for the latest stories
            </div>
          </div>

          <Link
            href="/news"
            className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-red-600"
          >
            All News
          </Link>
        </div>

        {/* NAVIGATION */}
        <nav className="border-t border-slate-100">
          <div className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-4 py-3 scrollbar-hide sm:px-6 lg:px-8">
            <Link
              href="/"
              className="shrink-0 text-sm font-black text-red-600"
            >
              Home
            </Link>

            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="shrink-0 text-sm font-semibold text-slate-600 transition hover:text-red-600"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* HERO */}
        {featured ? (
          <section className="py-6 sm:py-8">
            <div className="grid gap-5 lg:grid-cols-12">
              {/* MAIN STORY */}
              <Link
                href={articleHref(featured)}
                className="group relative overflow-hidden rounded-2xl bg-slate-950 lg:col-span-7"
              >
                <div className="relative min-h-[390px] sm:min-h-[470px]">
                  <StoryImage
                    story={featured}
                    className="absolute inset-0 transition duration-700 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                    <div className="mb-3 inline-flex rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                      {featured.category || "Top Story"}
                    </div>

                    <h1 className="max-w-3xl text-2xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                      {featured.title}
                    </h1>

                    <p className="mt-3 max-w-2xl line-clamp-2 text-sm leading-6 text-slate-200 sm:text-base">
                      {excerpt(featured.content, 180)}
                    </p>

                    <div className="mt-4 text-xs font-semibold text-slate-300">
                      {formatDate(featured.created_at)}
                    </div>
                  </div>
                </div>
              </Link>

              {/* SECONDARY STORIES */}
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
                {secondaryStories.map((story) => (
                  <Link
                    key={story.id}
                    href={articleHref(story)}
                    className="group flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="relative h-32 w-36 shrink-0 overflow-hidden bg-slate-200 sm:h-36 sm:w-44 lg:h-auto lg:w-40">
                      <StoryImage
                        story={story}
                        className="transition duration-500 group-hover:scale-105"
                      />
                    </div>

                    <div className="p-3 sm:p-4">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-red-600">
                        {story.category || "News"}
                      </div>

                      <h2 className="line-clamp-4 text-sm font-extrabold leading-5 text-slate-900 group-hover:text-red-600 sm:text-base">
                        {story.title}
                      </h2>

                      <div className="mt-2 text-[11px] text-slate-500">
                        {formatDate(story.created_at)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <div className="py-10 text-center">
            <h1 className="text-2xl font-black">No published stories yet</h1>
            <p className="mt-2 text-slate-500">
              Published stories will appear here.
            </p>
          </div>
        )}

        {/* AD */}
        <div className="my-4 overflow-hidden rounded-xl">
          <DirectAd />
        </div>

        {/* TRENDING + MOST READ */}
        <section className="grid gap-6 py-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionTitle title="Trending Now" />

            <div className="grid gap-4 sm:grid-cols-2">
              {trending.map((story) => (
                <SmallStoryCard key={story.id} story={story} />
              ))}
            </div>
          </div>

          <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <SectionTitle title="Most Read" />

            {mostRead.slice(0, 7).map((story, index) => (
              <NumberedStory
                key={story.id}
                story={story}
                number={index + 1}
              />
            ))}
          </aside>
        </section>

        {/* LATEST NEWS */}
        <section className="py-8">
          <SectionTitle title="Latest News" href="/news" />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {latestNews.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>

        {/* MID PAGE AD */}
        <div className="my-8 overflow-hidden rounded-xl">
          <DirectAd />
        </div>

        {/* CATEGORY SECTIONS */}
        {categories.map((category, categoryIndex) => {
          const stories = latest
            .filter((story) => categoryMatches(story, category))
            .slice(0, 5);

          if (!stories.length) return null;

          return (
            <section
              key={category.slug}
              className="py-8"
              id={category.slug}
            >
              <SectionTitle
                title={category.name}
                href={`/category/${category.slug}`}
              />

              <div className="grid gap-5 lg:grid-cols-12">
                {/* BIG CATEGORY STORY */}
                {stories[0] && (
                  <Link
                    href={articleHref(stories[0])}
                    className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 lg:col-span-6"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-200">
                      <StoryImage
                        story={stories[0]}
                        className="transition duration-500 group-hover:scale-105"
                      />
                    </div>

                    <div className="p-5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-red-600">
                        {category.name}
                      </div>

                      <h3 className="mt-2 line-clamp-3 text-xl font-black leading-tight text-slate-950 group-hover:text-red-600 sm:text-2xl">
                        {stories[0].title}
                      </h3>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                        {excerpt(stories[0].content, 170)}
                      </p>

                      <div className="mt-4 text-xs text-slate-500">
                        {formatDate(stories[0].created_at)}
                      </div>
                    </div>
                  </Link>
                )}

                {/* SMALL CATEGORY STORIES */}
                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-6">
                  {stories.slice(1).map((story) => (
                    <SmallStoryCard key={story.id} story={story} />
                  ))}
                </div>
              </div>

              {categoryIndex === 2 && (
                <div className="mt-8 overflow-hidden rounded-xl">
                  <DirectAd />
                </div>
              )}
            </section>
          );
        })}

        {/* NEWSLETTER */}
        <section className="my-10 overflow-hidden rounded-2xl bg-slate-950 px-6 py-10 text-white sm:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-red-500">
              Stay Updated
            </div>

            <h2 className="text-2xl font-black sm:text-3xl">
              Get the latest stories from JNMulee News
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Follow the latest Nigerian, African and global news across
              politics, business, technology, sports and entertainment.
            </p>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-2xl font-black">
                JNMulee<span className="text-red-600">.</span>
              </div>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Latest news and stories from Nigeria, Africa and around the
                world.
              </p>
            </div>

            <div>
              <h3 className="font-black text-slate-950">Categories</h3>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/category/${category.slug}`}
                    className="text-sm text-slate-500 hover:text-red-600"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-black text-slate-950">JNMulee News</h3>

              <div className="mt-3 space-y-2 text-sm">
                <Link
                  href="/news"
                  className="block text-slate-500 hover:text-red-600"
                >
                  Latest News
                </Link>

                <Link
                  href="/"
                  className="block text-slate-500 hover:text-red-600"
                >
                  Home
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-5 text-xs text-slate-500">
            © {new Date().getFullYear()} JNMulee News. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}