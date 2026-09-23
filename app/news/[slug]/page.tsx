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
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseServer.from("comments").insert({
    news_id: newsId,
    name,
    comment,
  });

  if (error) {
    console.error("Comment insert error:", error);
  }

  redirect(`/news/${slug}#comments`);
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;

  const { data: article, error } = await supabase
    .from("news")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !article) {
    notFound();
  }

  const title = article.title || "JNMulee News";
  const content = article.content || article.description || "";
  const description =
    cleanText(article.description || article.content || "").slice(
      0,
      160
    );

  const image =
    article.image_url ||
    article.image ||
    getImageFromContent(content);

  const publishedAt =
    article.published_at ||
    article.created_at ||
    new Date().toISOString();

  const articleUrl = `${SITE_URL}/news/${article.slug}`;

  const { data: comments } = await supabase
    .from("comments")
    .select("*")
    .eq("news_id", article.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <article>
          <div className="mb-6">
            <a
              href="/"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to Home
            </a>
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight md:text-5xl">
            {title}
          </h1>

          <div className="mb-6 text-sm text-gray-500">
            {formatDate(publishedAt)}
          </div>

          {image && (
            <div className="mb-8 overflow-hidden rounded-xl">
              <img
                src={image}
                alt={title}
                className="h-auto w-full object-cover"
              />
            </div>
          )}

          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{
              __html: content,
            }}
          />

          <div className="my-10">
            <DirectAd />
          </div>

          <div className="mt-12 border-t pt-8">
            <h2 className="mb-6 text-2xl font-bold">
              Comments
            </h2>

            <form action={postComment} className="mb-10 space-y-4">
              <input
                type="hidden"
                name="news_id"
                value={article.id}
              />

              <input
                type="hidden"
                name="slug"
                value={article.slug}
              />

              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Your name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  maxLength={80}
                  required
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label
                  htmlFor="comment"
                  className="mb-2 block text-sm font-medium"
                >
                  Your comment
                </label>

                <textarea
                  id="comment"
                  name="comment"
                  maxLength={2000}
                  required
                  rows={5}
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
                  placeholder="Write your comment..."
                />
              </div>

              <button
                type="submit"
                className="rounded-lg bg-black px-6 py-3 font-semibold text-white hover:opacity-90"
              >
                Post Comment
              </button>
            </form>

            <div className="space-y-6">
              {comments && comments.length > 0 ? (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-lg border p-5"
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <strong>
                        {comment.name || "Anonymous"}
                      </strong>

                      {comment.created_at && (
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      )}
                    </div>

                    <p className="whitespace-pre-wrap text-gray-700">
                      {comment.comment}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">
                  No comments yet. Be the first to comment.
                </p>
              )}
            </div>
          </div>
        </article>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: title,
            description,
            image: image ? [image] : undefined,
            datePublished: publishedAt,
            url: articleUrl,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": articleUrl,
            },
          }),
        }}
      />
    </>
  );
}