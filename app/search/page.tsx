import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news-jnnation.vercel.app";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Story = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  image_url: string | null;
  category: string | null;
  created_at: string;
};

const CATEGORY_LINKS = [
  { label: "News", href: "/category/news" },
  { label: "Nigeria", href: "/category/nigeria" },
  { label: "World", href: "/category/world" },
  { label: "Politics", href: "/category/politics" },
  { label: "Business", href: "/category/business" },
  { label: "Technology", href: "/category/technology" },
  { label: "Sports", href: "/category/sport" },
  { label: "Entertainment", href: "/category/entertainment" },
  { label: "Gossip", href: "/category/gossip" },
  { label: "Crypto", href: "/category/crypto" },
];

function cleanText(value: string | null): string {
  if (!value) return "";

  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getExcerpt(
  content: string | null,
  length = 180
): string {
  const text = cleanText(content);

  if (!text) {
    return "Read the full story on JNMulee News.";
  }

  if (text.length <= length) {
    return text;
  }

  return `${text
    .slice(0, length)
    .replace(/\s+\S*$/, "")}...`;
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatCategory(category: string | null): string {
  if (!category) return "News";

  return category
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCategoryHref(category: string | null): string {
  if (!category) {
    return "/category/news";
  }

  const normalized = category.toLowerCase().trim();

  if (normalized === "sports" || normalized === "sport") {
    return "/category/sport";
  }

  return `/category/${encodeURIComponent(normalized)}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = params.q?.trim() || "";

  const title = q
    ? `Search results for "${q}" | JNMulee News`
    : "Search JNMulee News";

  const description = q
    ? `Search JNMulee News for the latest stories, breaking news, sports, entertainment, business, technology and more about "${q}".`
    : "Search the latest news and stories from JNMulee News.";

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,

    robots: {
      index: false,
      follow: true,
    },

    alternates: {
      canonical: q
        ? `/search?q=${encodeURIComponent(q)}`
        : "/search",
    },

    openGraph: {
      title,
      description,
      url: q
        ? `${SITE_URL}/search?q=${encodeURIComponent(q)}`
        : `${SITE_URL}/search`,
      siteName: "JNMulee News",
      type: "website",
    },

    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;

  const q = params.q?.trim() || "";

  let stories: Story[] = [];
  let searchError = false;

  if (q) {
    /*
     * Remove PostgREST wildcard characters.
     * The search phrase itself remains intact.
     */
    const searchTerm = q
      .replace(/[%_]/g, "")
      .trim()
      .slice(0, 100);

    if (searchTerm) {
      /*
       * Search title and content separately.
       *
       * This avoids constructing a raw PostgREST OR expression
       * from user input and makes the search more robust when
       * users enter commas, parentheses or other characters.
       */
      const pattern = `%${searchTerm}%`;

      const [titleResult, contentResult] =
        await Promise.all([
          supabase
            .from("news")
            .select(
              "id,title,slug,content,image_url,category,created_at"
            )
            .eq("Published", true)
            .not("image_url", "is", null)
            .neq("image_url", "")
            .ilike("title", pattern)
            .order("created_at", { ascending: false })
            .limit(50),

          supabase
            .from("news")
            .select(
              "id,title,slug,content,image_url,category,created_at"
            )
            .eq("Published", true)
            .not("image_url", "is", null)
            .neq("image_url", "")
            .ilike("content", pattern)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

      if (titleResult.error || contentResult.error) {
        searchError = true;
      } else {
        const combined = [
          ...((titleResult.data || []) as Story[]),
          ...((contentResult.data || []) as Story[]),
        ];

        /*
         * Remove duplicate stories that matched both title
         * and content, then sort newest first.
         */
        const uniqueStories = Array.from(
          new Map(
            combined.map((story) => [story.id, story])
          ).values()
        );

        uniqueStories.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );

        stories = uniqueStories.slice(0, 50);
      }
    }
  }

  return (
    <main className="searchPage">
      <style>{`
        .searchPage {
          min-height: 100vh;
          background: #f7f9fc;
          color: #172033;
        }

        .searchContainer {
          width: min(1200px, calc(100% - 32px));
          margin: 0 auto;
        }

        .searchPageInner {
          padding: 34px 0 80px;
        }

        .searchBreadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
          color: #7b8495;
          font-size: 13px;
        }

        .searchBreadcrumb a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 750;
        }

        .searchBreadcrumb a:hover {
          text-decoration: underline;
        }

        .searchHero {
          position: relative;
          overflow: hidden;
          margin-bottom: 28px;
          padding: 34px;
          border-radius: 22px;
          background:
            linear-gradient(
              135deg,
              #0b1220 0%,
              #111c31 60%,
              #17284a 100%
            );
          color: #ffffff;
          box-shadow: 0 18px 45px rgba(11, 18, 32, 0.14);
        }

        .searchHero::after {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          right: -100px;
          top: -120px;
          border-radius: 50%;
          background: rgba(96, 165, 250, 0.13);
          pointer-events: none;
        }

        .searchEyebrow {
          position: relative;
          z-index: 1;
          margin: 0 0 8px;
          color: #60a5fa;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.2px;
          text-transform: uppercase;
        }

        .searchTitle {
          position: relative;
          z-index: 1;
          margin: 0;
          max-width: 760px;
          font-size: clamp(32px, 5vw, 52px);
          line-height: 1.03;
          letter-spacing: -1.8px;
          font-weight: 900;
        }

        .searchSubtitle {
          position: relative;
          z-index: 1;
          max-width: 720px;
          margin: 13px 0 0;
          color: #cbd5e1;
          font-size: 16px;
          line-height: 1.65;
        }

        .searchBox {
          position: relative;
          z-index: 2;
          display: flex;
          gap: 10px;
          margin-top: 25px;
          max-width: 850px;
        }

        .searchInput {
          flex: 1;
          min-width: 0;
          height: 54px;
          border: 1px solid #d5dbe5;
          border-radius: 12px;
          padding: 0 17px;
          background: #ffffff;
          color: #172033;
          font-size: 16px;
          outline: none;
          box-shadow: 0 5px 18px rgba(0, 0, 0, 0.08);
        }

        .searchInput::placeholder {
          color: #8a93a3;
        }

        .searchInput:focus {
          border-color: #60a5fa;
          box-shadow:
            0 0 0 3px rgba(96, 165, 250, 0.22),
            0 5px 18px rgba(0, 0, 0, 0.08);
        }

        .searchButton {
          height: 54px;
          padding: 0 26px;
          border: 0;
          border-radius: 12px;
          background: #2563eb;
          color: #ffffff;
          font-size: 15px;
          font-weight: 850;
          cursor: pointer;
          transition:
            background 0.18s ease,
            transform 0.18s ease;
        }

        .searchButton:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .resultsHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin: 34px 0 18px;
        }

        .resultsHeading {
          margin: 0;
          font-size: 25px;
          line-height: 1.2;
          letter-spacing: -0.5px;
          font-weight: 900;
        }

        .resultCount {
          color: #70798a;
          font-size: 14px;
          white-space: nowrap;
        }

        .resultsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .storyCard {
          min-width: 0;
          overflow: hidden;
          border: 1px solid #e2e7ef;
          border-radius: 17px;
          background: #ffffff;
          box-shadow: 0 7px 24px rgba(17, 24, 39, 0.045);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .storyCard:hover {
          transform: translateY(-4px);
          border-color: #cdd6e3;
          box-shadow: 0 16px 34px rgba(17, 24, 39, 0.10);
        }

        .storyImageLink {
          display: block;
          text-decoration: none;
        }

        .storyImage {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #e7ebf1;
        }

        .storyImage img {
          object-fit: cover;
          transition: transform 0.35s ease;
        }

        .storyCard:hover .storyImage img {
          transform: scale(1.045);
        }

        .storyBody {
          padding: 18px;
        }

        .categoryLabel {
          display: inline-flex;
          align-items: center;
          margin-bottom: 9px;
          color: #2563eb;
          font-size: 11px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.7px;
          text-transform: uppercase;
        }

        .storyTitleLink {
          display: block;
          color: #172033;
          text-decoration: none;
        }

        .storyTitleLink:hover {
          color: #1d4ed8;
        }

        .storyTitle {
          margin: 0 0 10px;
          font-size: 20px;
          line-height: 1.27;
          letter-spacing: -0.35px;
          font-weight: 850;
        }

        .storyExcerpt {
          margin: 0 0 15px;
          color: #606b7c;
          font-size: 14px;
          line-height: 1.6;
        }

        .storyMeta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          color: #8992a2;
          font-size: 12px;
        }

        .storyCategoryLink {
          color: #6d7788;
          text-decoration: none;
          font-weight: 650;
        }

        .storyCategoryLink:hover {
          color: #2563eb;
        }

        .emptyState {
          padding: 60px 24px;
          border: 1px solid #e1e6ee;
          border-radius: 20px;
          background: #ffffff;
          text-align: center;
          box-shadow: 0 9px 28px rgba(17, 24, 39, 0.045);
        }

        .emptyIcon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 62px;
          height: 62px;
          margin: 0 auto 17px;
          border: 1px solid #dbe5f5;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          font-size: 27px;
          font-weight: 900;
        }

        .emptyTitle {
          margin: 0 0 9px;
          color: #172033;
          font-size: 25px;
          font-weight: 900;
        }

        .emptyText {
          max-width: 590px;
          margin: 0 auto;
          color: #697486;
          font-size: 15px;
          line-height: 1.65;
        }

        .errorState {
          border-color: #dbe3ef;
        }

        .errorState .emptyIcon {
          background: #fff7ed;
          border-color: #fed7aa;
          color: #c2410c;
        }

        .tipsBox {
          max-width: 680px;
          margin: 28px auto 0;
          padding: 22px;
          border-radius: 15px;
          background: #0b1220;
          color: #ffffff;
          text-align: left;
        }

        .tipsTitle {
          margin: 0 0 7px;
          font-size: 17px;
          font-weight: 850;
        }

        .tipsText {
          margin: 0;
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.65;
        }

        @media (max-width: 950px) {
          .resultsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 680px) {
          .searchContainer {
            width: min(100% - 22px, 1200px);
          }

          .searchPageInner {
            padding-top: 24px;
            padding-bottom: 55px;
          }

          .searchHero {
            padding: 25px 20px;
            border-radius: 18px;
          }

          .searchTitle {
            letter-spacing: -1px;
          }

          .searchSubtitle {
            font-size: 14px;
          }

          .searchBox {
            flex-direction: column;
          }

          .searchButton {
            width: 100%;
          }

          .resultsHeader {
            align-items: flex-start;
            flex-direction: column;
            gap: 7px;
            margin-top: 28px;
          }

          .resultsGrid {
            grid-template-columns: 1fr;
            gap: 17px;
          }

          .storyTitle {
            font-size: 19px;
          }

          .emptyState {
            padding: 45px 18px;
          }
        }
      `}</style>

      <div className="searchContainer searchPageInner">
        <div className="searchBreadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>
          <span>Search</span>
        </div>

        <section className="searchHero">
          <p className="searchEyebrow">JNMulee News</p>

          <h1 className="searchTitle">
            Search the latest news
          </h1>

          <p className="searchSubtitle">
            Find published stories across Nigeria, world news,
            politics, business, technology, sports,
            entertainment, gossip, crypto and more.
          </p>

          <form
            action="/search"
            method="GET"
            className="searchBox"
          >
            <input
              className="searchInput"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search for a topic, person, place or story..."
              aria-label="Search JNMulee News"
              autoComplete="off"
              maxLength={100}
            />

            <button
              className="searchButton"
              type="submit"
            >
              Search
            </button>
          </form>
        </section>

        {q && !searchError && (
          <div className="resultsHeader">
            <h2 className="resultsHeading">
              Results for “{q}”
            </h2>

            <span className="resultCount">
              {stories.length}{" "}
              {stories.length === 1 ? "story" : "stories"} found
            </span>
          </div>
        )}

        {searchError ? (
          <section className="emptyState errorState">
            <div className="emptyIcon">!</div>

            <h2 className="emptyTitle">
              Search temporarily unavailable
            </h2>

            <p className="emptyText">
              We could not complete your search right now.
              Please try again in a moment.
            </p>
          </section>
        ) : stories.length > 0 ? (
          <section
            className="resultsGrid"
            aria-label="Search results"
          >
            {stories.map((story) => (
              <article
                className="storyCard"
                key={story.id}
              >
                {story.image_url && (
                  <Link
                    href={`/news/${story.slug}`}
                    className="storyImageLink"
                  >
                    <div className="storyImage">
                      <Image
                        src={story.image_url}
                        alt={story.title}
                        fill
                        sizes="
                          (max-width: 680px) 100vw,
                          (max-width: 950px) 50vw,
                          33vw
                        "
                      />
                    </div>
                  </Link>
                )}

                <div className="storyBody">
                  <Link
                    href={getCategoryHref(story.category)}
                    className="categoryLabel"
                  >
                    {formatCategory(story.category)}
                  </Link>

                  <Link
                    href={`/news/${story.slug}`}
                    className="storyTitleLink"
                  >
                    <h2 className="storyTitle">
                      {story.title}
                    </h2>
                  </Link>

                  <p className="storyExcerpt">
                    {getExcerpt(story.content)}
                  </p>

                  <div className="storyMeta">
                    <span>
                      {formatDate(story.created_at)}
                    </span>

                    <span>•</span>

                    <Link
                      href={getCategoryHref(story.category)}
                      className="storyCategoryLink"
                    >
                      {formatCategory(story.category)}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : q ? (
          <section className="emptyState">
            <div className="emptyIcon">?</div>

            <h2 className="emptyTitle">
              No results found
            </h2>

            <p className="emptyText">
              We could not find published stories matching
              “{q}”. Try a different keyword, name, location or
              topic.
            </p>

            <div className="tipsBox">
              <h3 className="tipsTitle">
                Search tips
              </h3>

              <p className="tipsText">
                Try shorter keywords, different spellings, a
                person's name, a team name, a company, or a
                broader topic.
              </p>
            </div>
          </section>
        ) : (
          <section className="emptyState">
            <div className="emptyIcon">⌕</div>

            <h2 className="emptyTitle">
              What are you looking for?
            </h2>

            <p className="emptyText">
              Enter a keyword above to search JNMulee News for
              published stories.
            </p>

            <div className="tipsBox">
              <h3 className="tipsTitle">
                Search JNMulee News
              </h3>

              <p className="tipsText">
                Search for breaking news, sports, entertainment,
                politics, business, technology, crypto and other
                topics covered by JNMulee News.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}