import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_CATEGORIES = [
  "Top Stories",
  "News",
  "Nigeria",
  "World",
  "Business",
  "Technology",
  "Sports",
  "Gossip",
  "Entertainment",
  "Politics",
  "Crypto",
];

function cleanText(value: string | null | undefined) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function getImage(item: Element) {
  const enclosure = item.querySelector("enclosure");
  const media = item.querySelector("media\\:content, content");
  const thumbnail = item.querySelector("media\\:thumbnail");
  const image = item.querySelector("image");

  const candidates = [
    enclosure?.getAttribute("url"),
    media?.getAttribute("url"),
    thumbnail?.getAttribute("url"),
    image?.textContent,
  ];

  const html = item.querySelector("description")?.textContent || "";

  const htmlMatch = html.match(
    /<img[^>]+(?:src|data-src)=["']([^"']+)["']/i
  );

  if (htmlMatch?.[1]) {
    candidates.push(htmlMatch[1]);
  }

  for (const value of candidates) {
    if (!value) continue;

    const url = value.trim();

    if (/^https?:\/\/.+/i.test(url)) {
      return url;
    }
  }

  return null;
}

function makeSlug(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 180) +
    "-" +
    Date.now()
  );
}

async function parseFeed(feedUrl: string) {
  const response = await fetch(feedUrl, {
    headers: {
      "User-Agent": "JNMuleeNews/1.0",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Feed returned ${response.status}`);
  }

  const xml = await response.text();

  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map(
    (match) => match[0]
  );

  return items;
}

function xmlValue(item: string, tag: string) {
  const match = item.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  );

  return match?.[1]
    ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

function extractImage(item: string) {
  const matches = [
    item.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1],
    item.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1],
    item.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1],
    item.match(/<image[^>]*>([\s\S]*?)<\/image>/i)?.[1],
    item.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1],
  ];

  for (const image of matches) {
    if (image && /^https?:\/\//i.test(image.trim())) {
      return image.trim();
    }
  }

  return null;
}

export async function GET() {
  let processed = 0;
  let generated = 0;
  let published = 0;
  let skipped = 0;
  let skippedNoImage = 0;
  const errors: string[] = [];

  try {
    const { data: sources, error: sourceError } = await supabase
      .from("sources")
      .select("*")
      .eq("active", true);

    if (sourceError) {
      throw sourceError;
    }

    for (const source of sources || []) {
      if (!source.feed_url) continue;

      try {
        const items = await parseFeed(source.feed_url);

        for (const rawItem of items.slice(0, 20)) {
          processed++;

          const title = cleanText(xmlValue(rawItem, "title"));

          const link =
            xmlValue(rawItem, "link") ||
            xmlValue(rawItem, "guid") ||
            "";

          const description = cleanText(
            xmlValue(rawItem, "description") ||
              xmlValue(rawItem, "content:encoded")
          );

          if (!title || !link) {
            skipped++;
            continue;
          }

          const imageUrl = extractImage(rawItem);

          // HARD RULE:
          // No image = never insert/publish the article.
          if (!imageUrl) {
            skippedNoImage++;
            continue;
          }

          const { data: duplicate } = await supabase
            .from("news")
            .select("id")
            .eq("source_url", link)
            .limit(1)
            .maybeSingle();

          if (duplicate) {
            skipped++;
            continue;
          }

          const category = ALLOWED_CATEGORIES.includes(source.category)
            ? source.category
            : "Top Stories";

          const content = description || title;

          const { error } = await supabase.from("news").insert({
            title,
            slug: makeSlug(title),
            content,
            image_url: imageUrl,
            Published: false,
            source_url: link,
            category,
          });

          if (error) {
            errors.push(`${title}: ${error.message}`);
            continue;
          }

          generated++;
        }
      } catch (error) {
        errors.push(
          `${source.name}: ${
            error instanceof Error ? error.message : "Feed error"
          }`
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      generated,
      published,
      skipped,
      skippedNoImage,
      errors,
      message:
        "Feed import completed. Articles without images were skipped.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        processed,
        generated,
        published,
        skipped,
        skippedNoImage,
        errors: [
          error instanceof Error ? error.message : "Unknown error",
        ],
      },
      { status: 500 }
    );
  }
}