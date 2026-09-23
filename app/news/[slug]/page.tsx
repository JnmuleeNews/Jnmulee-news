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

  if (name.length > 80 || comment.length > 2000) {
    redirect(`/news/${slug}#comments`);
  }

  const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    story.image_url ||
    getImageFromContent(rawContent);

  const cleanContent = cleanText(rawContent);

  const articleUrl =
    `${SITE_URL}/news/${story.slug}`;

  const xShareUrl =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      story.title
    )}&url=${encodeURIComponent(articleUrl)}`;

  const facebookShareUrl =
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      articleUrl
    )}`;

  const whatsappShareUrl =
    `https://wa.me/?text=${encodeURIComponent(
      `${story.title}\n\n${articleUrl}`
    )}`;

  const { data: comments } = await supabase
    .from("comments")
    .select(
      "id, name, comment, created_at"
    )
    .eq("news_id", story.id)
    .order("created_at", {
      ascending: false,
    });

  return (
    <main>
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            JNMulee <span>News</span>
          </a>

          <nav
            className="mainNav"
            aria-label="Main navigation"
          >
            <a href="/">Home</a>

            <a href="/category/news">
              News
            </a>

            <a href="/category/sport">
              Sport
            </a>

            <a href="/category/entertainment">
              Entertainment
            </a>

            <a href="/category/gossip">
              Gossip
            </a>

            <a href="/category/business">
              Business
            </a>

            <a href="/category/crypto">
              Crypto
            </a>
          </nav>
        </div>
      </header>

      <DirectAd placement="article_top" />

      <article className="container articlePage">
        <p className="category">
          {story.category || "News"}
        </p>

        <h1>{story.title}</h1>

        <p className="articleDate">
          {formatDate(story.created_at)}
        </p>

        {imageUrl && (
          <img
            className="articleHeroImage"
            src={imageUrl}
            alt={story.title}
          />
        )}

        <div className="articleContent">
          {cleanContent}
        </div>

        <div className="shareLinks">
          <a
            href={xShareUrl}
            target="_blank"
            rel="noreferrer"
          >
            X
          </a>

          <a
            href={facebookShareUrl}
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </a>

          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </div>

        <DirectAd placement="article_between" />

        <section
          id="comments"
          className="commentsSection"
        >
          <h2>Comments</h2>

          <form
            action={postComment}
            className="commentForm"
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
              placeholder="Your name"
              maxLength={80}
              required
            />

            <textarea
              name="comment"
              placeholder="Write a comment..."
              maxLength={2000}
              required
            />

            <button type="submit">
              Post Comment
            </button>
          </form>

          <div className="commentList">
            {(comments ?? []).map((comment) => (
              <div
                className="comment"
                key={comment.id}
              >
                <strong>
                  {comment.name}
                </strong>

                <p>{comment.comment}</p>

                <small>
                  {formatDate(
                    comment.created_at
                  )}
                </small>
              </div>
            ))}

            {!comments?.length && (
              <p>
                No comments yet. Be the first
                to comment.
              </p>
            )}
          </div>
        </section>
      </article>
    </main>
  );
}