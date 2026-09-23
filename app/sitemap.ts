import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://jnmulee-news-jnnation.vercel.app";

  const now = new Date();

  const urls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
  ];

  const categories = [
    "nigeria",
    "world",
    "business",
    "technology",
    "sports",
    "entertainment",
    "gossip",
    "politics",
    "crypto",
  ];

  for (const category of categories) {
    urls.push({
      url: `${baseUrl}/category/${category}`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    });
  }

  const { data: stories } = await supabase
    .from("news")
    .select("slug,created_at")
    .eq("Published", true)
    .not("image_url", "is", null)
    .neq("image_url", "")
    .order("created_at", { ascending: false })
    .limit(5000);

  for (const story of stories || []) {
    if (!story.slug) continue;

    urls.push({
      url: `${baseUrl}/news/${story.slug}`,
      lastModified: story.created_at
        ? new Date(story.created_at)
        : now,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  return urls;
}