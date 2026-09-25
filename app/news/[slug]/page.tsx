import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import ShareButtons from "@/components/ShareButtons";
import ArticleViewTracker from "@/components/ArticleViewTracker";
import DirectAd from "@/components/DirectAd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ comment?: string }>;
};

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .trim();
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;

  const { data: story } = await supabase
    .from("news")
    .select(
      "id,title,slug,content,excerpt,image,category,created_at,Published"
    )
    .eq("slug", slug)
    .eq("Published", true)
    .maybeSingle();

  if (!story) {
    return {
      title: "News Article | JNMulee News",
    };
  }

  const title =
    typeof story.title === "string"
      ? story.title
      : "JNMulee News";

  const description =
    typeof story.excerpt === "string" && story.excerpt.trim()
      ? story.excerpt.trim().slice(0, 160)
      : stripHtml(
          typeof story.content === "string" ? story.content : ""
        ).slice(0, 160);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://jnmulee-news-jnnation.vercel.app";

  const canonical = `${siteUrl}/news/${story.slug}`;

  const image =
    typeof story.image === "string" && story.image.trim()
      ? story.image
      : undefined;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      siteName: "JNMulee News",
      publishedTime: story.created_at || undefined,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function NewsArticlePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};

  const { data: story, error: storyError } = await supabase
    .from("news")
    .select("*")
    .eq("slug", slug)
    .eq("Published", true)
    .maybeSingle();

  if (storyError || !story) {
    notFound();
  }

  const commentsResult = await supabase
    .from("comments")
    .select("id,name,comment,created_at")
    .eq("news_id", story.id)
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(100);

  const comments = commentsResult.data || [];

  const { data: relatedStories } = await supabase
    .from("news")
    .select("id,title,slug,image,category,created_at")
    .eq("Published", true)
    .eq("category", story.category)
    .neq("id", story.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const articleTitle =
    typeof story.title === "string"
      ? story.title
      : "JNMulee News";

  const articleContent =
    typeof story.content === "string"
      ? cleanText(story.content)
      : "";

  const articleImage =
    typeof story.image === "string" && story.image.trim()
      ? story.image
      : null;

  const category =
    typeof story.category === "string" && story.category.trim()
      ? story.category
      : "News";

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://jnmulee-news-jnnation.vercel.app";

  const canonical = `${siteUrl}/news/${story.slug}`;

  /*
   * COMMENTS
   *
   * New comments are automatically approved.
   * SUPABASE_SERVICE_ROLE_KEY is used ONLY on the server.
   * Never put this key in a NEXT_PUBLIC_ variable.
   */
  async function postComment(formData: FormData) {
    "use server";

    const name = String(formData.get("name") || "").trim();
    const comment = String(formData.get("comment") || "").trim();

    if (!name || name.length < 1 || name.length > 80) {
      redirect(`/news/${slug}?comment=invalid`);
    }

    if (!comment || comment.length < 1 || comment.length > 2000) {
      redirect(`/news/${slug}?comment=invalid`);
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error(
        "SUPABASE_SERVICE_ROLE_KEY is missing from the server environment."
      );

      redirect(`/news/${slug}?comment=error`);
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: article, error: articleError } = await adminClient
      .from("news")
      .select("id")
      .eq("slug", slug)
      .eq("Published", true)
      .maybeSingle();

    if (articleError || !article) {
      console.error("Comment article lookup error:", articleError);

      redirect(`/news/${slug}?comment=error`);
    }

    const { error: insertError } = await adminClient
      .from("comments")
      .insert({
        news_id: article.id,
        name,
        comment,
        approved: true,
      });

    if (insertError) {
      console.error("Comment insert error:", insertError);

      redirect(`/news/${slug}?comment=error`);
    }

    redirect(`/news/${slug}?comment=success`);
  }

  const commentStatus =
    query.comment === "success"
      ? "success"
      : query.comment === "invalid"
        ? "invalid"
        : query.comment === "error"
          ? "error"
          : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: articleTitle,
    datePublished: story.created_at || undefined,
    dateModified: story.created_at || undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    publisher: {
      "@type": "Organization",
      name: "JNMulee News",
      url: siteUrl,
    },
    image: articleImage ? [articleImage] : undefined,
  };

  return (
    <>
      <ArticleViewTracker newsId={story.id} />

      <main className="jn-article-page">
        <div className="jn-container">
          <nav className="jn-breadcrumb">
            <Link href="/">Home</Link>
            <span>›</span>
            <Link href={`/category/${encodeURIComponent(category)}`}>
              {category}
            </Link>
            <span>›</span>
            <span>Article</span>
          </nav>

          <article className="jn-article">
            <div className="jn-category">{category}</div>

            <h1>{articleTitle}</h1>

            {story.created_at && (
              <div className="jn-date">
                {formatDate(story.created_at)}
              </div>
            )}

            {articleImage && (
              <div className="jn-hero-image">
                <Image
                  src={articleImage}
                  alt={articleTitle}
                  width={1200}
                  height={675}
                  priority
                  unoptimized
                />
              </div>
            )}

            <div className="jn-ad-wrap">
              <DirectAd />
            </div>

            <div
              className="jn-content"
              dangerouslySetInnerHTML={{
                __html: articleContent,
              }}
            />

            <div className="jn-ad-wrap">
              <DirectAd />
            </div>

            <div className="jn-share">
              <ShareButtons
                title={articleTitle}
                url={canonical}
              />
            </div>
          </article>

          <section className="jn-comments" id="comments">
            <div className="jn-section-heading">
              <h2>Comments</h2>
              <span>{comments.length}</span>
            </div>

            {commentStatus === "success" && (
              <div className="jn-comment-success">
                Your comment was posted successfully.
              </div>
            )}

            {commentStatus === "invalid" && (
              <div className="jn-comment-error">
                Please enter a valid name and comment.
              </div>
            )}

            {commentStatus === "error" && (
              <div className="jn-comment-error">
                Your comment could not be posted. Please try again.
              </div>
            )}

            <form action={postComment} className="jn-comment-form">
              <input
                type="text"
                name="name"
                placeholder="Your name"
                maxLength={80}
                required
                autoComplete="name"
              />

              <textarea
                name="comment"
                placeholder="Write your comment..."
                maxLength={2000}
                required
                rows={5}
              />

              <button
                type="submit"
                className="jn-comment-button"
              >
                Post Comment
              </button>
            </form>

            <div className="jn-comment-list">
              {comments.length === 0 ? (
                <p className="jn-no-comments">
                  No comments yet. Be the first to comment.
                </p>
              ) : (
                comments.map((item) => (
                  <div
                    className="jn-comment"
                    key={item.id}
                  >
                    <div className="jn-comment-top">
                      <strong>{item.name}</strong>

                      <span>
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <p>{item.comment}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {relatedStories && relatedStories.length > 0 && (
            <section className="jn-related">
              <div className="jn-section-heading">
                <h2>Related News</h2>
              </div>

              <div className="jn-related-grid">
                {relatedStories.map((related) => (
                  <Link
                    href={`/news/${related.slug}`}
                    className="jn-related-card"
                    key={related.id}
                  >
                    {related.image && (
                      <div className="jn-related-image">
                        <Image
                          src={related.image}
                          alt={related.title || "Related news"}
                          width={500}
                          height={280}
                          unoptimized
                        />
                      </div>
                    )}

                    <div className="jn-related-body">
                      <span>{related.category || "News"}</span>

                      <h3>{related.title}</h3>

                      {related.created_at && (
                        <small>
                          {formatDate(related.created_at)}
                        </small>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <style>{`
        .jn-article-page {
          width: 100%;
          background: #fff;
          color: #111827;
        }

        .jn-container {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
          padding: 24px 0 60px;
        }

        .jn-breadcrumb {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          font-size: 14px;
          color: #64748b;
          margin-bottom: 24px;
        }

        .jn-breadcrumb a {
          color: #2563eb;
          text-decoration: none;
        }

        .jn-article {
          max-width: 900px;
          margin: 0 auto;
        }

        .jn-category {
          display: inline-block;
          background: #0f172a;
          color: #fff;
          border-radius: 999px;
          padding: 7px 13px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 14px;
        }

        .jn-article h1 {
          margin: 0;
          font-size: clamp(32px, 5vw, 58px);
          line-height: 1.08;
          letter-spacing: -1.5px;
          color: #0f172a;
        }

        .jn-date {
          margin: 16px 0 24px;
          color: #64748b;
          font-size: 14px;
        }

        .jn-hero-image {
          width: 100%;
          overflow: hidden;
          border-radius: 16px;
          background: #f1f5f9;
          margin-bottom: 26px;
        }

        .jn-hero-image img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: cover;
        }

        .jn-ad-wrap {
          margin: 22px 0;
        }

        .jn-content {
          font-size: 18px;
          line-height: 1.8;
          color: #1e293b;
          overflow-wrap: anywhere;
        }

        .jn-content p {
          margin: 0 0 22px;
        }

        .jn-content h2,
        .jn-content h3,
        .jn-content h4 {
          color: #0f172a;
          line-height: 1.25;
          margin: 32px 0 15px;
        }

        .jn-content img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
        }

        .jn-content a {
          color: #2563eb;
        }

        .jn-share {
          margin: 30px 0;
        }

        .jn-comments,
        .jn-related {
          max-width: 900px;
          margin: 55px auto 0;
        }

        .jn-section-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 14px;
          margin-bottom: 22px;
        }

        .jn-section-heading h2 {
          margin: 0;
          color: #0f172a;
          font-size: 28px;
        }

        .jn-section-heading span {
          min-width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #e2e8f0;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
        }

        .jn-comment-form {
          display: grid;
          gap: 12px;
          margin-bottom: 30px;
        }

        .jn-comment-form input,
        .jn-comment-form textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 13px 14px;
          font: inherit;
          color: #0f172a;
          background: #fff;
          outline: none;
        }

        .jn-comment-form input:focus,
        .jn-comment-form textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .jn-comment-form textarea {
          resize: vertical;
          min-height: 130px;
        }

        .jn-comment-button {
          width: fit-content;
          border: 0;
          border-radius: 10px;
          padding: 12px 20px;
          background: #0f172a;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }

        .jn-comment-button:hover {
          background: #1e293b;
        }

        .jn-comment-success,
        .jn-comment-error {
          border-radius: 10px;
          padding: 13px 15px;
          margin-bottom: 18px;
          font-size: 14px;
        }

        .jn-comment-success {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .jn-comment-error {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .jn-comment-list {
          display: grid;
          gap: 14px;
        }

        .jn-comment {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 17px;
          background: #fff;
        }

        .jn-comment-top {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 8px;
        }

        .jn-comment-top strong {
          color: #0f172a;
        }

        .jn-comment-top span {
          color: #64748b;
          font-size: 12px;
        }

        .jn-comment p {
          margin: 0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          color: #334155;
          line-height: 1.6;
        }

        .jn-no-comments {
          color: #64748b;
          margin: 0;
        }

        .jn-related-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .jn-related-card {
          display: block;
          text-decoration: none;
          color: inherit;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .jn-related-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
        }

        .jn-related-image {
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #f1f5f9;
        }

        .jn-related-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .jn-related-body {
          padding: 15px;
        }

        .jn-related-body > span {
          color: #2563eb;
          font-size: 12px;
          font-weight: 700;
        }

        .jn-related-body h3 {
          margin: 7px 0;
          font-size: 17px;
          line-height: 1.35;
          color: #0f172a;
        }

        .jn-related-body small {
          color: #64748b;
          font-size: 12px;
        }

        @media (max-width: 800px) {
          .jn-related-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 560px) {
          .jn-container {
            width: min(100% - 20px, 1180px);
            padding-top: 16px;
          }

          .jn-article h1 {
            font-size: 34px;
          }

          .jn-content {
            font-size: 17px;
            line-height: 1.75;
          }

          .jn-related-grid {
            grid-template-columns: 1fr;
          }

          .jn-comment-top {
            flex-direction: column;
            gap: 4px;
          }
        }
      `}</style>
    </>
  );
}