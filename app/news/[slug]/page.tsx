import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DirectAd from "@/components/DirectAd";
import ShareButtons from "@/components/ShareButtons";

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
      "id,title,slug,content,image_url,Published,category,created_at"
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
      <main
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "32px 16px 60px",
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <Link
            href="/"
            style={{
              color: "#d7193f",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ← Back to Home
          </Link>
        </div>

        <article>
          <p className="category">
            {category}
          </p>

          <h1
            style={{
              fontSize:
                "clamp(2rem, 5vw, 3.6rem)",
              lineHeight: 1.08,
              margin: "10px 0 18px",
              fontWeight: 800,
            }}
          >
            {title}
          </h1>

          <div
            style={{
              color: "#6b7280",
              fontSize: "14px",
              marginBottom: "28px",
            }}
          >
            Published {formatDate(publishedAt)}
          </div>

          {image ? (
            <figure
              style={{
                margin: "0 0 32px",
              }}
            >
              <img
                src={image}
                alt={title}
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  maxHeight: "650px",
                  objectFit: "cover",
                  borderRadius: "14px",
                }}
              />
            </figure>
          ) : null}

          <div
            style={{
              fontSize: "18px",
              lineHeight: 1.8,
              color: "#1f2937",
            }}
            dangerouslySetInnerHTML={{
              __html: content,
            }}
          />

          <ShareButtons
            title={title}
            url={articleUrl}
          />

          <div
            style={{
              margin: "40px 0",
            }}
          >
            <DirectAd
              placement="article_middle"
            />
          </div>
        </article>

        {relatedStories &&
        relatedStories.length > 0 ? (
          <section
            style={{
              marginTop: "55px",
              paddingTop: "30px",
              borderTop:
                "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 800,
                marginBottom: "22px",
              }}
            >
              Related Stories
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "20px",
              }}
            >
              {relatedStories.map(
                (related) => (
                  <article
                    key={related.id}
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: "12px",
                      overflow: "hidden",
                      background:
                        "#ffffff",
                    }}
                  >
                    <Link
                      href={`/news/${related.slug}`}
                      style={{
                        color: "inherit",
                        textDecoration:
                          "none",
                      }}
                    >
                      {related.image_url ? (
                        <img
                          src={
                            related.image_url
                          }
                          alt={
                            related.title
                          }
                          style={{
                            width: "100%",
                            aspectRatio:
                              "16 / 9",
                            objectFit:
                              "cover",
                            display:
                              "block",
                          }}
                        />
                      ) : null}

                      <div
                        style={{
                          padding: "16px",
                        }}
                      >
                        <p
                          className="category"
                          style={{
                            marginBottom:
                              "8px",
                          }}
                        >
                          {related.category ||
                            category}
                        </p>

                        <h3
                          style={{
                            fontSize:
                              "18px",
                            lineHeight:
                              1.35,
                            fontWeight: 700,
                            margin: 0,
                          }}
                        >
                          {
                            related.title
                          }
                        </h3>
                      </div>
                    </Link>
                  </article>
                )
              )}
            </div>
          </section>
        ) : null}

        <section
          id="comments"
          style={{
            marginTop: "55px",
            paddingTop: "30px",
            borderTop:
              "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              fontSize: "28px",
              fontWeight: 800,
              marginBottom: "24px",
            }}
          >
            Comments
          </h2>

          <form
            action={postComment}
            style={{
              marginBottom: "40px",
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

            <div
              style={{
                marginBottom: "16px",
              }}
            >
              <label
                htmlFor="name"
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Your name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                maxLength={80}
                required
                placeholder="Enter your name"
                style={{
                  width: "100%",
                  padding: "13px 15px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "16px",
                  boxSizing:
                    "border-box",
                }}
              />
            </div>

            <div
              style={{
                marginBottom: "16px",
              }}
            >
              <label
                htmlFor="comment"
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Your comment
              </label>

              <textarea
                id="comment"
                name="comment"
                maxLength={2000}
                required
                rows={5}
                placeholder="Write your comment..."
                style={{
                  width: "100%",
                  padding: "13px 15px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "16px",
                  resize: "vertical",
                  boxSizing:
                    "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                background: "#d7193f",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "13px 22px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Post Comment
            </button>

            <p
              style={{
                marginTop: "10px",
                color: "#6b7280",
                fontSize: "13px",
              }}
            >
              Comments are reviewed before
              appearing publicly.
            </p>
          </form>

          <div>
            {comments &&
            comments.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "18px",
                }}
              >
                {comments.map(
                  (comment) => (
                    <div
                      key={comment.id}
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        borderRadius:
                          "10px",
                        padding: "18px",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap: "15px",
                          marginBottom:
                            "10px",
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <strong>
                          {comment.name ||
                            "Anonymous"}
                        </strong>

                        {comment.created_at ? (
                          <span
                            style={{
                              color:
                                "#6b7280",
                              fontSize:
                                "12px",
                            }}
                          >
                            {formatDate(
                              comment.created_at
                            )}
                          </span>
                        ) : null}
                      </div>

                      <p
                        style={{
                          margin: 0,
                          whiteSpace:
                            "pre-wrap",
                          lineHeight: 1.7,
                          color:
                            "#374151",
                        }}
                      >
                        {comment.comment}
                      </p>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p
                style={{
                  color: "#6b7280",
                }}
              >
                No approved comments yet.
                Be the first to comment.
              </p>
            )}
          </div>
        </section>
      </main>

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