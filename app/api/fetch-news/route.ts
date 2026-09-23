import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const allowedCategories = [
  "Top Stories",
  "News",
  "World",
  "Business",
  "Technology",
  "Sports",
  "Gossip",
  "Entertainment",
  "Politics",
  "Crypto",
];

function stripHtml(text: string) {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .trim();
}

function decodeXml(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function makeSlug(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") +
    "-" +
    Date.now()
  );
}

function getTagValue(item: string, tag: string) {
  const match = item.match(
    new RegExp(
      `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    )
  );

  return match ? decodeXml(match[1].trim()) : "";
}

function getImageUrl(item: string) {
  const enclosure = item.match(
    /<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i
  );

  if (enclosure?.[1]) {
    return decodeXml(enclosure[1].trim());
  }

  const mediaContent = item.match(
    /<media:content[^>]+url=["']([^"']+)["'][^>]*>/i
  );

  if (mediaContent?.[1]) {
    return decodeXml(mediaContent[1].trim());
  }

  const thumbnail = item.match(
    /<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*>/i
  );

  if (thumbnail?.[1]) {
    return decodeXml(thumbnail[1].trim());
  }

  const imageFromHtml = item.match(
    /<img[^>]+src=["']([^"']+)["']/i
  );

  if (imageFromHtml?.[1]) {
    return decodeXml(imageFromHtml[1].trim());
  }

  return null;
}

export async function GET() {
  try {
    const { data: sources, error: sourceError } = await supabase
      .from("sources")
      .select("name,feed_url,category,active")
      .eq("active", true);

    if (sourceError) {
      return NextResponse.json(
        {
          success: false,
          error: sourceError.message,
        },
        { status: 500 }
      );
    }

    let added = 0;
    let skipped = 0;

    for (const source of sources ?? []) {
      try {
        const category = allowedCategories.includes(source.category)
          ? source.category
          : "Top Stories";

        const response = await fetch(source.feed_url, {
          headers: {
            "User-Agent": "JNMulee-News/1.0",
            Accept:
              "application/rss+xml, application/xml, text/xml, */*",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          skipped++;
          continue;
        }

        const xml = await response.text();

        const items = [
          ...xml.matchAll(/<item[\s\S]*?<\/item>/gi),
        ];

        for (const match of items.slice(0, 10)) {
          const item = match[0];

          const title = stripHtml(
            getTagValue(item, "title")
          );

          const link = stripHtml(
            getTagValue(item, "link")
          );

          const description = stripHtml(
            getTagValue(item, "description")
          );

          if (!title || !link) {
            skipped++;
            continue;
          }

          const imageUrl = getImageUrl(item);

          const { data: existing, error: duplicateError } =
            await supabase
              .from("news")
              .select("id")
              .eq("source_url", link)
              .maybeSingle();

          if (duplicateError) {
            skipped++;
            continue;
          }

          if (existing) {
            skipped++;
            continue;
          }

          const content =
            description ||
            `Latest news information from ${source.name}.`;

          const { error: insertError } = await supabase
            .from("news")
            .insert({
              title,
              slug: makeSlug(title),
              content,
              image_url: imageUrl,
              source_url: link,
              category,
              Published: false,
            });

          if (insertError) {
            skipped++;
            continue;
          }

          added++;
        }
      } catch {
        skipped++;
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      added,
      skipped,
      message:
        "RSS import completed. New stories remain unpublished until they have an image.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}