import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news-jnnation.vercel.app";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const urls: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },

    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },

    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },

    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },

    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  /*
   * PUBLIC CATEGORY PAGES
   */
  for (const category of categories) {
    urls.push({
      url: `${SITE_URL}/category/${category}`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    });
  }

  /*
   * PUBLIC NEWS ARTICLES ONLY
   *
   * We include only:
   * - Published articles
   * - Articles with an image
   * - Articles with a valid slug
   */
  const { data: stories, error } =
    await supabase
      .from("news")
      .select(
        "slug,created_at,Published,image_url"
      )
      .eq("Published", true)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .not("slug", "is", null)
      .order("created_at", {
        ascending: false,
      })
      .limit(5000);

  if (!error && stories) {
    for (const story of stories) {
      if (
        !story.slug ||
        typeof story.slug !== "string"
      ) {
        continue;
      }

      urls.push({
        url: `${SITE_URL}/news/${encodeURIComponent(
          story.slug
        )}`,

        lastModified:
          story.created_at
            ? new Date(
                story.created_at
              )
            : now,

        changeFrequency: "daily",

        priority: 0.7,
      });
    }
  }

  return urls;
}