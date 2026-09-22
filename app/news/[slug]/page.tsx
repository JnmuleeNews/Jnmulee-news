import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import DirectAd from "@/components/DirectAd";

type Props = {
  params: Promise<{ slug: string }>;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const decoded = decodeHtml(value);

  return decoded
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

  const newsId = String(formData.get("news_id") || "");
  const slug = String(formData.get("slug") || "");
  const name = String(formData.get("name") || "").trim();
  const comment = String(formData.get("comment") || "").trim();

  if (!newsId || !slug || !name || !comment) {
    redirect(`/news/${slug}#comments`);
  }

  if (name.length > 80 || comment.length > 2000) {
    redirect(`/news/${slug}#comments`);
  }

  const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  await supabaseServer.from("comments").insert({
    news_id: newsId,
    name,
    comment,
  });

  redirect(`/news/${slug}#comments`);
}

export default async function Article({ params }: Props) {
  const { slug } = await params;

  const { data: story, error } = await supabase
    .from("news")
    .select(
      "id, title, slug, content, image_url, category, created_at"
    )
    .eq("slug", slug)
    .eq("Published", true)
    .maybeSingle();

  if (error || !story) {
    notFound();
  }

  const rawContent = story.content || "";

  const imageUrl =
    story.image_url || getImageFromContent(rawContent);

  const cleanContent = cleanText(rawContent);

  // Get comments for this particular article
  const { data: comments } = await supabase
    .from("comments")
    .select("id, name, comment, created_at")
    .eq("news_id", story.id)
    .order("created_at", { ascending: false });

  // Get related posts from the same category
  const { data: relatedPosts } = await supabase
    .from("news")
    .select("id, title, slug, image_url, category, created_at")
    .eq("Published", true)
    .eq("category", story.category)
    .neq("id", story.id)
    .order("created_at", { ascending: false })
    .limit(3);

  // Get the next older published story
  const { data: nextPosts } = await supabase
    .from("news")
    .select("title, slug")
    .eq("Published", true)
    .lt("created_at", story.created_at)
    .order("created_at", { ascending: false })
    .limit(1);

  const nextPost = nextPosts?.[0] || null;

  return (
    <main>
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            JNMulee <span>News</span>
          </a>

          <a href="/">⌂ Home</a>
        </div>
      </header>

      <article className="container article">
        {/* Category */}
        <p className="category">
          {story.category || "News"}
        </p>

        {/* Headline */}
        <h1>{story.title}</h1>

        {/* Publication information */}
        <p className="meta">
          Published by JNMulee News • {formatDate(story.created_at)}
        </p>

        {/* Top Advertisement */}
        <DirectAd placement="article_top" />

        {/* Main image */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={story.title}
            style={{
              width: "100%",
              maxHeight: 520,
              objectFit: "cover",
              borderRadius: 16,
              margin: "20px 0 28px",
            }}
          />
        )}

        {/* Middle Advertisement */}
        <DirectAd placement="article_middle" />

        {/* Article */}
        <div className="articleBody">
          {cleanContent ? (
            cleanContent
              .split(/\n+/)
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index} style={{ marginBottom: 18 }}>
                  {paragraph}
                </p>
              ))
          ) : (
            <p>
              Read the latest story from JNMulee News.
            </p>
          )}
        </div>

        {/* Bottom Advertisement */}
        <DirectAd placement="article_bottom" />

        {/* COMMENTS */}
        <section
          id="comments"
          style={{
            marginTop: 50,
            paddingTop: 30,
            borderTop: "1px solid #ddd",
          }}
        >
          <h2>Comments</h2>

          <form
            action={postComment}
            style={{
              marginTop: 20,
              marginBottom: 35,
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

            <input
              name="name"
              type="text"
              placeholder="Your name"
              maxLength={80}
              required
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: 12,
                border: "1px solid #ccc",
                borderRadius: 8,
              }}
            />

            <textarea
              name="comment"
              placeholder="Write your comment..."
              maxLength={2000}
              required
              rows={5}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: 12,
                border: "1px solid #ccc",
                borderRadius: 8,
                resize: "vertical",
              }}
            />

            <button
              type="submit"
              style={{
                padding: "12px 20px",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Post Comment
            </button>
          </form>

          {/* Existing comments */}
          {comments && comments.length > 0 ? (
            <div>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    padding: "16px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <strong>{comment.name}</strong>

                  <small
                    style={{
                      marginLeft: 10,
                      opacity: 0.65,
                    }}
                  >
                    {formatDate(comment.created_at)}
                  </small>

                  <p style={{ marginTop: 8 }}>
                    {comment.comment}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>
              No comments yet. Be the first to comment.
            </p>
          )}
        </section>

        {/* RELATED NEWS */}
        {relatedPosts && relatedPosts.length > 0 && (
          <section
            style={{
              marginTop: 55,
              paddingTop: 30,
              borderTop: "1px solid #ddd",
            }}
          >
            <h2>Related News</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
                marginTop: 20,
              }}
            >
              {relatedPosts.map((post) => (
                <a
                  key={post.id}
                  href={`/news/${post.slug}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      style={{
                        width: "100%",
                        height: 150,
                        objectFit: "cover",
                        borderRadius: 12,
                      }}
                    />
                  )}

                  <h3 style={{ marginTop: 10 }}>
                    {post.title}
                  </h3>

                  <small>
                    {formatDate(post.created_at)}
                  </small>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* NEXT NEWS */}
        {nextPost && (
          <section
            style={{
              marginTop: 45,
              paddingTop: 25,
              borderTop: "1px solid #ddd",
            }}
          >
            <p style={{ opacity: 0.7 }}>
              Next News
            </p>

            <a
              href={`/news/${nextPost.slug}`}
              style={{
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {nextPost.title} →
            </a>
          </section>
        )}
      </article>
    </main>
  );
}