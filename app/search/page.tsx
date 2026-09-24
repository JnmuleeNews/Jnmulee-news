import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

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
  { label: "Home", href: "/" },
  { label: "News", href: "/category/news" },
  { label: "Sports", href: "/category/sport" },
  { label: "Entertainment", href: "/category/entertainment" },
  { label: "Gossip", href: "/category/gossip" },
  { label: "Business", href: "/category/business" },
  { label: "Technology", href: "/category/technology" },
  { label: "Politics", href: "/category/politics" },
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

function getExcerpt(content: string | null, length = 180): string {
  const text = cleanText(content);

  if (!text) {
    return "Read the full story on JNMulee News.";
  }

  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).replace(/\s+\S*$/, "")}...`;
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
  if (!category) return "/category/news";

  const normalized = category.toLowerCase();

  if (normalized === "sports") {
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
     * Remove wildcard characters used by PostgREST ilike.
     * Keep the user's actual search phrase otherwise.
     */
    const searchTerm = q.replace(/[%_]/g, "").trim();

    if (searchTerm) {
      const { data, error } = await supabase
        .from("news")
        .select(
          "id,title,slug,content,image_url,category,created_at"
        )
        .eq("Published", true)
        .not("image_url", "is", null)
        .neq("image_url", "")
        .or(
          `title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        searchError = true;
      } else {
        stories = (data || []) as Story[];
      }
    }
  }

  return (
    <main className="searchPage">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .searchPage {
          min-height: 100vh;
          background: #f5f6f8;
          color: #111827;
        }

        .container {
          width: min(1200px, calc(100% - 32px));
          margin: 0 auto;
        }

        .siteHeader {
          position: sticky;
          top: 0;
          z-index: 50;
          background: #c8102e;
          color: white;
          box-shadow: 0 2px 12px rgba(0,0,0,.12);
        }

        .headerTop {
          min-height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .logo {
          color: white;
          text-decoration: none;
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -.8px;
          white-space: nowrap;
        }

        .headerSearch {
          flex: 1;
          max-width: 420px;
          position: relative;
        }

        .headerSearch input {
          width: 100%;
          height: 40px;
          border: 0;
          border-radius: 999px;
          padding: 0 18px;
          font-size: 14px;
          outline: none;
        }

        .categoryNav {
          background: #a90d27;
          border-top: 1px solid rgba(255,255,255,.12);
          overflow-x: auto;
          scrollbar-width: none;
        }

        .categoryNav::-webkit-scrollbar {
          display: none;
        }

        .categoryNavInner {
          display: flex;
          align-items: center;
          gap: 4px;
          min-height: 42px;
          white-space: nowrap;
        }

        .categoryNav a {
          color: rgba(255,255,255,.94);
          text-decoration: none;
          padding: 11px 13px;
          font-size: 13px;
          font-weight: 700;
        }

        .categoryNav a:hover {
          background: rgba(255,255,255,.12);
        }

        .pageContainer {
          padding-top: 34px;
          padding-bottom: 70px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 18px;
          color: #6b7280;
          font-size: 13px;
        }

        .breadcrumb a {
          color: #c8102e;
          text-decoration: none;
          font-weight: 700;
        }

        .pageTitle {
          margin: 0;
          font-size: clamp(30px, 5vw, 48px);
          line-height: 1.05;
          letter-spacing: -1.5px;
          font-weight: 900;
        }

        .pageSubtitle {
          margin: 10px 0 28px;
          color: #6b7280;
          font-size: 16px;
        }

        .searchBox {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 8px 25px rgba(17,24,39,.05);
          margin-bottom: 30px;
        }

        .searchForm {
          display: flex;
          gap: 10px;
        }

        .searchInput {
          flex: 1;
          min-width: 0;
          height: 52px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 0 16px;
          font-size: 16px;
          color: #111827;
          background: white;
          outline: none;
        }

        .searchInput:focus {
          border-color: #c8102e;
          box-shadow: 0 0 0 3px rgba(200,16,46,.1);
        }

        .searchButton {
          height: 52px;
          padding: 0 25px;
          border: 0;
          border-radius: 10px;
          background: #c8102e;
          color: white;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .searchButton:hover {
          background: #a90d27;
        }

        .resultsHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 18px;
        }

        .resultsTitle {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
        }

        .resultCount {
          color: #6b7280;
          font-size: 14px;
          white-space: nowrap;
        }

        .resultsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .newsCard {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
          transition:
            transform .18s ease,
            box-shadow .18s ease,
            border-color .18s ease;
        }

        .newsCard:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(17,24,39,.1);
          border-color: #d1d5db;
        }

        .newsCardLink {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .newsImage {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #e5e7eb;
        }

        .newsImage img {
          object-fit: cover;
          transition: transform .3s ease;
        }

        .newsCard:hover .newsImage img {
          transform: scale(1.035);
        }

        .newsCardBody {
          padding: 17px;
        }

        .categoryLabel {
          display: inline-block;
          margin-bottom: 9px;
          color: #c8102e;
          font-size: 11px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: .6px;
          text-transform: uppercase;
        }

        .newsTitle {
          margin: 0 0 9px;
          font-size: 20px;
          line-height: 1.25;
          letter-spacing: -.3px;
          font-weight: 850;
        }

        .newsExcerpt {
          margin: 0 0 14px;
          color: #596273;
          font-size: 14px;
          line-height: 1.55;
        }

        .storyMeta {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #8a93a3;
          font-size: 12px;
        }

        .emptyState {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 60px 25px;
          text-align: center;
          box-shadow: 0 8px 25px rgba(17,24,39,.04);
        }

        .emptyIcon {
          width: 58px;
          height: 58px;
          margin: 0 auto 16px;
          border-radius: 50%;
          background: #fef2f2;
          color: #c8102e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          font-weight: 900;
        }

        .emptyState h2 {
          margin: 0 0 8px;
          font-size: 24px;
        }

        .emptyState p {
          max-width: 520px;
          margin: 0 auto;
          color: #6b7280;
          line-height: 1.6;
        }

        .errorState {
          border-color: #fecaca;
        }

        .searchTips {
          margin-top: 32px;
          background: #111827;
          color: white;
          border-radius: 16px;
          padding: 24px;
        }

        .searchTips h2 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .searchTips p {
          margin: 0;
          color: #d1d5db;
          line-height: 1.6;
          font-size: 14px;
        }

        .siteFooter {
          background: #111827;
          color: white;
          padding: 35px 0;
        }

        .footerLinks {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin-bottom: 20px;
        }

        .footerLinks a {
          color: #d1d5db;
          text-decoration: none;
          font-size: 14px;
        }

        .footerLinks a:hover {
          color: white;
        }

        .footerCopyright {
          margin: 0;
          color: #9ca3af;
          font-size: 13px;
        }

        @media (max-width: 900px) {
          .resultsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .headerSearch {
            max-width: 300px;
          }
        }

        @media (max-width: 650px) {
          .container {
            width: min(100% - 22px, 1200px);
          }

          .headerTop {
            min-height: 58px;
          }

          .logo {
            font-size: 21px;
          }

          .headerSearch {
            display: none;
          }

          .pageContainer {
            padding-top: 25px;
          }

          .searchForm {
            flex-direction: column;
          }

          .searchButton {
            width: 100%;
          }

          .resultsGrid {
            grid-template-columns: 1fr;
          }

          .resultsHeader {
            align-items: flex-start;
            flex-direction: column;
            gap: 6px;
          }

          .newsTitle {
            font-size: 19px;
          }
        }
      `}</style>

      <header className="siteHeader">
        <div className="container headerTop">
          <Link href="/" className="logo">
            JNMulee News
          </Link>

          <form action="/search" method="GET" className="headerSearch">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search JNMulee News..."
              aria-label="Search JNMulee News"
            />
          </form>
        </div>

        <nav className="categoryNav" aria-label="Main navigation">
          <div className="container categoryNavInner">
            {CATEGORY_LINKS.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <div className="container pageContainer">
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>
          <span>Search</span>
        </div>

        <h1 className="pageTitle">Search JNMulee News</h1>

        <p className="pageSubtitle">
          Find published stories across news, sports, entertainment,
          business, technology, politics and more.
        </p>

        <section className="searchBox">
          <form
            action="/search"
            method="GET"
            className="searchForm"
          >
            <input
              className="searchInput"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search for a topic, person, place or story..."
              aria-label="Search for news"
              autoComplete="off"
            />

            <button className="searchButton" type="submit">
              Search
            </button>
          </form>
        </section>

        {q && !searchError && (
          <div className="resultsHeader">
            <h2 className="resultsTitle">
              Results for “{q}”
            </h2>

            <span className="resultCount">
              {stories.length}{" "}
              {stories.length === 1 ? "story" : "stories"} found
            </span>
          </div>
        )}

        {searchError ? (
          <div className="emptyState errorState">
            <div className="emptyIcon">!</div>

            <h2>Search temporarily unavailable</h2>

            <p>
              We could not complete your search right now.
              Please try again in a moment.
            </p>
          </div>
        ) : stories.length > 0 ? (
          <section className="resultsGrid" aria-label="Search results">
            {stories.map((story) => (
              <article className="newsCard" key={story.id}>
                <Link
                  href={`/news/${story.slug}`}
                  className="newsCardLink"
                >
                  {story.image_url && (
                    <div className="newsImage">
                      <Image
                        src={story.image_url}
                        alt={story.title}
                        fill
                        sizes="
                          (max-width: 650px) 100vw,
                          (max-width: 900px) 50vw,
                          33vw
                        "
                      />
                    </div>
                  )}

                  <div className="newsCardBody">
                    <span className="categoryLabel">
                      {formatCategory(story.category)}
                    </span>

                    <h2 className="newsTitle">
                      {story.title}
                    </h2>

                    <p className="newsExcerpt">
                      {getExcerpt(story.content)}
                    </p>

                    <div className="storyMeta">
                      <span>
                        {formatDate(story.created_at)}
                      </span>

                      <span>•</span>

                      <Link
                        href={getCategoryHref(story.category)}
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        style={{
                          color: "#6b7280",
                          textDecoration: "none",
                        }}
                      >
                        {formatCategory(story.category)}
                      </Link>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </section>
        ) : q ? (
          <div className="emptyState">
            <div className="emptyIcon">?</div>

            <h2>No results found</h2>

            <p>
              We could not find published stories matching
              “{q}”. Try a different keyword, name, location or
              topic.
            </p>

            <div className="searchTips">
              <h2>Search tips</h2>

              <p>
                Try shorter keywords, different spellings, a
                person's name, a team name, a company, or a
                broader topic.
              </p>
            </div>
          </div>
        ) : (
          <div className="emptyState">
            <div className="emptyIcon">⌕</div>

            <h2>What are you looking for?</h2>

            <p>
              Enter a keyword above to search JNMulee News for
              published stories.
            </p>

            <div className="searchTips">
              <h2>Search JNMulee News</h2>

              <p>
                Search for breaking news, sports, entertainment,
                politics, business, technology, crypto and other
                topics covered by JNMulee News.
              </p>
            </div>
          </div>
        )}
      </div>

      <footer className="siteFooter">
        <div className="container">
          <div className="footerLinks">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms</Link>
          </div>

          <p className="footerCopyright">
            © {new Date().getFullYear()} JNMulee News. All rights
            reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}