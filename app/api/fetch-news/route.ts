import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

function stripHtml(text: string) {
  return text
    .replace(/<!\[CDATA\[/gi, "")
    .replace(/\]\]>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getImage(item: string) {
  const mediaContent = item.match(
    /<media:content[^>]+url=["']([^"']+)["'][^>]*>/i
  );

  if (mediaContent?.[1]) {
    return mediaContent[1];
  }

  const enclosure = item.match(
    /<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i
  );

  if (enclosure?.[1]) {
    return enclosure[1];
  }

  const image = item.match(
    /<img[^>]+src=["']([^"']+)["'][^>]*>/i
  );

  if (image?.[1]) {
    return image[1];
  }

  return null;
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

export async function GET() {
  try {
    const { data: sources, error: sourceError } = await supabase
      .from("sources")
      .select("name,feed_url,category,active")
      .eq("active", true);

    if (sourceError) {
      return NextResponse.json(
        { error: sourceError.message },
        { status: 500 }
      );
    }

    let added = 0;

    for (const source of sources ?? []) {
      const response = await fetch(source.feed_url, {
        headers: {
          "User-Agent": "JNMulee-News/1.0",
        },
        cache: "no-store",
      });

      if (!response.ok) continue;

      const xml = await response.text();

      const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)];

      for (const match of items.slice(0, 10)) {
        const item = match[0];

        const titleMatch = item.match(
          /<title[^>]*>([\s\S]*?)<\/title>/i
        );

        const linkMatch = item.match(
          /<link[^>]*>([\s\S]*?)<\/link>/i
        );

        const descriptionMatch = item.match(
          /<description[^>]*>([\s\S]*?)<\/description>/i
        );

        if (!titleMatch || !linkMatch) continue;

        const title = stripHtml(titleMatch[1]);
        const link = stripHtml(linkMatch[1]);

        const description = descriptionMatch
          ? stripHtml(descriptionMatch[1])
          : "";

        const imageUrl = getImage(item);

        if (!title || !link) continue;

        const { data: existing, error: duplicateError } =
          await supabase
            .from("news")
            .select("source_url")
            .eq("source_url", link)
            .maybeSingle();

        if (duplicateError) {
          return NextResponse.json(
            { error: duplicateError.message },
            { status: 500 }
          );
        }

        if (existing) continue;

        const content =
          description ||
          `Read the latest story from ${source.name}.`;

        const { error: insertError } = await supabase
          .from("news")
          .insert({
            title,
            slug: makeSlug(title),
            content,
            image_url: imageUrl,
            source_url: link,
            category: source.category,
            Published: true,
          });

        if (insertError) {
          return NextResponse.json(
            { error: insertError.message },
            { status: 500 }
          );
        }

        added++;
      }
    }

    return NextResponse.json({
      success: true,
      added,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}