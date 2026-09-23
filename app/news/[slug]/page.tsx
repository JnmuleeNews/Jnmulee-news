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
    description