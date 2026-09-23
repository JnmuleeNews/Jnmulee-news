
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DirectAd from "@/components/DirectAd";
import ShareButtons from "@/components/ShareButtons";
import ArticleViewTracker from "@/components/ArticleViewTracker";

type Props = {
  params: Promise<{ slug: string }>;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news.vercel.app";

function decodeHtml(value: string) {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

function cleanText(value: string) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDescription(value: string) {
  const text = cleanText(value);

  if (!text) {
    return "Latest news from JNMulee News.";
  }

  if (text.length <= 160) {
    return text;
  }

  return `${text.substring(0, 157).trim()}...`;
}

function getImageFromContent(value: string) {
  const decoded = decodeHtml(value);

  const match = decoded.match(
    /<img[^>]+src=["']([^"']+)["']/i
  );

  return match?.[1] ?? null;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function postComment(formData: FormData) {
  "use server";

  const newsId = String(
    formData.get("news_id") || ""
  );

  const slug = String(
    formData.get("slug") || ""
  );

  const name = String(
    formData.get("name") || ""
  ).trim();

  const comment = String(
    formData.get("comment") || ""
  ).trim();

  if (!newsId || !slug || !name || !comment) {
    redirect(`/news/${slug}#comments`);
  }

  if (
    name.length > 80 ||
    comment.length > 2000
  ) {
    redirect(`/news/${slug}#comments`);
  }

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY is missing."
    );

    redirect(`/news/${slug}#comments`);
  }

  const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const { data: article } =
    await supabaseServer
      .from("news")
      .select("id,slug")
      .eq("id", newsId)
      .eq("slug", slug)
      .eq("Published", true)
      .single();

  if (!article) {
    redirect("/");
  }

  const { error } = await supabaseServer
    .from("comments")
    .insert({
      news_id: newsId,
      name,
      comment,
      approved: false,
    });

  if (error) {
    console.error(
      "Comment insert error:",
      error
    );
  }

  redirect(`/news/${slug}#comments`);
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;

  const { data: story } = await supabase
    .from("news")
    .select(
      "title,content,image_url,slug,category,created_at"
    )
    .eq("slug", slug)
    .eq("Published", true)
    .single();

  if (!story) {
    return {
      title: "News | JNMulee News",
      description:
        "Latest news from JNMulee News.",
    };
  }

  const title =
    story.title || "JNMulee News";

  const description = getDescription(
    story.content || ""
  );

  const image =
    story.image_url ||
    getImageFromContent(
      story.content || ""
    );

  const articleUrl =
    `${SITE_URL}/news/${story.slug}`;

  return {
    title,
    description,

    alternates: {
      canonical: articleUrl,
    },

    openGraph: {
      title,
      description,
      url: articleUrl,
      siteName: "JNMulee News",
      type: "article",
      publishedTime:
        story.created_at || undefined,
      section:
        story.category || "News",
      images: image
        ? [
            {
              url: image,
              alt: title,
            },
          ]
        : undefined,
    },

    twitter: {
      card: image
        ? "summary_large_image"
        : "summary",
      title,
      description,
      images: image
        ? [image]
        : undefined,
    },

    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function NewsArticlePage({
  params,
}: Props) {
  const { slug } = await params;

  const { data: story, error } = await supabase
    .from("news")
    .select(
      "id,title,slug,content,image_url,Published,category,created_at,view_count"
    )
    .eq("slug", slug)
    .eq("Published", true)
    .single();

  if (error || !story) {
    notFound();
  }

  const title =
    story.title || "JNMulee News";

  const content =
    story.content || "";

  const description = getDescription(
    content
  );

  const image =
    story.image_url ||
    getImageFromContent(content);

  const publishedAt =
    story.created_at ||
    new Date().toISOString();

  const articleUrl =
    `${SITE_URL}/news/${story.slug}`;

  const category =
    story.category || "News";

  const { data: comments } =
    await supabase
      .from("comments")
      .select(
        "id,name,comment,created_at"
      )
      .eq("news_id", story.id)
      .eq("approved", true)
      .order("created_at", {
        ascending: false,
      });

  const { data: relatedStories } =
    await supabase
      .from("news")
      .select(
        "id,title,slug,image_url,category,created_at"
      )
      .eq("Published", true)
      .eq("category", category)
      .neq("id", story.id)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .order("created_at", {
        ascending: false,
      })
      .limit(4);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description,
    image: image ? [image] : undefined,
    datePublished: publishedAt,
    dateModified: publishedAt,
    url: articleUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "JNMulee News",
      url: SITE_URL,
    },
    articleSection: category,
  };

  return (
    <>
      <ArticleViewTracker
        newsId={story.id}
      />

      <header
        style={{
          background: "#d7193f",
          color: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#fff",
              textDecoration: "none",
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            JNMulee News
          </Link>

          <Link
            href="/search"
            style={{
              color: "#fff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Search
          </Link>
        </div>
      </header>

      <nav
        style={{
          borderBottom: "1px solid #eee",
          background: "#fff",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "10px 20px",
            display: "flex",
            gap: "10px",
            whiteSpace: "nowrap",
          }}
        >
          {[
            ["Nigeria", "nigeria"],
            ["World", "world"],
            ["Business", "business"],
            ["Technology", "technology"],
            ["Sports", "sports"],
            ["Entertainment", "entertainment"],
            ["Gossip", "gossip"],
            ["Politics", "politics"],
            ["Crypto", "crypto"],
          ].map(([label, value]) => (
            <Link
              key={value}
              href={`/category/${value}`}
              style={{
                color: "#333",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <main
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "30px 20px 60px",
        }}
      >
        <article>
          <div
            style={{
              color: "#d7193f",
              fontWeight: 700,
              fontSize: "14px",
              marginBottom: "10px",
            }}
          >
            {category}
          </div>

          <h1
            style={{
              fontSize:
                "clamp(32px, 5vw, 54px)",
              lineHeight: 1.08,
              margin: "0 0 14px",
              color: "#111",
            }}
          >
            {title}
          </h1>

          <div
            style={{
              color: "#666",
              fontSize: "14px",
              marginBottom: "20px",
            }}
          >
            Published{" "}
            {formatDate(publishedAt)}
          </div>

          {image && (
            <img
              src={image}
              alt={title}
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "600px",
                objectFit: "cover",
                borderRadius: "12px",
                display: "block",
                marginBottom: "25px",
              }}
            />
          )}

          <div
            style={{
              fontSize: "18px",
              lineHeight: 1.8,
              color: "#222",
            }}
            dangerouslySetInnerHTML={{
              __html: decodeHtml(content),
            }}
          />

          <div
            style={{
              marginTop: "25px",
              paddingTop: "20px",
              borderTop: "1px solid #eee",
            }}
          >
            <ShareButtons
              title={title}
              url={articleUrl}
            />
          </div>

          <div style={{ marginTop: "30px" }}>
            <DirectAd placement="article" />
          </div>
        </article>

        {relatedStories &&
          relatedStories.length > 0 && (
            <section
              style={{
                marginTop: "50px",
              }}
            >
              <h2
                style={{
                  fontSize: "26px",
                  marginBottom: "20px",
                }}
              >
                Related Stories
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                }}
              >
                {relatedStories.map(
                  (related) => (
                    <Link
                      key={related.id}
                      href={`/news/${related.slug}`}
                      style={{
                        textDecoration: "none",
                        color: "#111",
                        border:
                          "1px solid #eee",
                        borderRadius: "10px",
                        overflow: "hidden",
                        background: "#fff",
                      }}
                    >
                      {related.image_url && (
                        <img
                          src={
                            related.image_url
                          }
                          alt={
                            related.title
                          }
                          style={{
                            width: "100%",
                            height: "150px",
                            objectFit:
                              "cover",
                            display:
                              "block",
                          }}
                        />
                      )}

                      <div
                        style={{
                          padding: "14px",
                        }}
                      >
                        <div
                          style={{
                            color:
                              "#d7193f",
                            fontSize:
                              "12px",
                            fontWeight:
                              700,
                            marginBottom:
                              "6px",
                          }}
                        >
                          {related.category ||
                            "News"}
                        </div>

                        <div
                          style={{
                            fontWeight:
                              700,
                            lineHeight:
                              1.35,
                          }}
                        >
                          {related.title}
                        </div>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </section>
          )}

        <section
          id="comments"
          style={{
            marginTop: "55px",
          }}
        >
          <h2
            style={{
              fontSize: "28px",
              marginBottom: "20px",
            }}
          >
            Comments
          </h2>

          <form
            action={postComment}
            style={{
              border:
                "1px solid #eee",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "30px",
              background: "#fafafa",
            }}
          >
            <input
              type="hidden"
              name="news_id"
              value={story.id}
            />

            <input
              type="hidden"
              name="slug"
              value={story.slug}
            />

            <label
              htmlFor="name"
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "7px",
              }}
            >
              Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={80}
              placeholder="Your name"
              style={{
                width: "100%",
                padding: "12px",
                border:
                  "1px solid #ddd",
                borderRadius: "8px",
                marginBottom: "16px",
                boxSizing:
                  "border-box",
              }}
            />

            <label
              htmlFor="comment"
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "7px",
              }}
            >
              Comment
            </label>

            <textarea
              id="comment"
              name="comment"
              required
              maxLength={2000}
              rows={6}
              placeholder="Write your comment..."
              style={{
                width: "100%",
                padding: "12px",
                border:
                  "1px solid #ddd",
                borderRadius: "8px",
                marginBottom: "16px",
                boxSizing:
                  "border-box",
                resize: "vertical",
              }}
            />

            <button
              type="submit"
              style={{
                background:
                  "#d7193f",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding:
                  "12px 22px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Post Comment
            </button>

            <p
              style={{
                fontSize: "13px",
                color: "#777",
                marginTop: "10px",
                marginBottom: 0,
              }}
            >
              Comments are reviewed
              before appearing publicly.
            </p>
          </form>

          {comments &&
          comments.length > 0 ? (
            <div
              style={{
                display: "grid",
                gap: "16px",
              }}
            >
              {comments.map(
                (comment) => (
                  <div
                    key={comment.id}
                    style={{
                      borderBottom:
                        "1px solid #eee",
                      paddingBottom:
                        "16px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        marginBottom:
                          "4px",
                      }}
                    >
                      {comment.name}
                    </div>

                    <div
                      style={{
                        fontSize:
                          "12px",
                        color:
                          "#888",
                        marginBottom:
                          "8px",
                      }}
                    >
                      {formatDate(
                        comment.created_at
                      )}
                    </div>

                    <div
                      style={{
                        lineHeight:
                          1.6,
                        whiteSpace:
                          "pre-wrap",
                      }}
                    >
                      {comment.comment}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <p
              style={{
                color: "#777",
              }}
            >
              No approved comments yet.
              Be the first to comment.
            </p>
          )}
        </section>

        <div
          style={{
            marginTop: "40px",
          }}
        >
          <DirectAd
            placement="article_middle"
          />
        </div>
      </main>

      <footer
        style={{
          borderTop: "1px solid #eee",
          background: "#111",
          color: "#fff",
          padding: "30px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "18px",
            justifyContent:
              "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong>
              JNMulee News
            </strong>
            <div
              style={{
                color: "#bbb",
                fontSize: "13px",
                marginTop: "5px",
              }}
            >
              Independent digital news
              and current affairs.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "15px",
              fontSize: "13px",
            }}
          >
            <Link
              href="/"
              style={{
                color: "#fff",
              }}
            >
              Home
            </Link>

            <Link
              href="/about"
              style={{
                color: "#fff",
              }}
            >
              About
            </Link>

            <Link
              href="/contact"
              style={{
                color: "#fff",
              }}
            >
              Contact
            </Link>

            <Link
              href="/privacy"
              style={{
                color: "#fff",
              }}
            >
              Privacy
            </Link>

            <Link
              href="/terms"
              style={{
                color: "#fff",
              }}
            >
              Terms
            </Link>
          </div>
        </div>

        <div
          style={{
            maxWidth: "1200px",
            margin: "20px auto 0",
            paddingTop: "15px",
            borderTop:
              "1px solid #333",
            color: "#999",
            fontSize: "12px",
          }}
        >
          © {new Date().getFullYear()} JNMulee
          News. All rights reserved.
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              structuredData
            ),
        }}
      />
    </>
  );
}