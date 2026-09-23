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
    story.image_url || getImageFromContent(rawContent);

  const cleanContent = cleanText(rawContent);

  const articleUrl = `${SITE_URL}/news/${story.slug}`;

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
    .select("id, name, comment, created_at")
    .eq("news_id", story.id)
    .order("created_at", { ascending: false });