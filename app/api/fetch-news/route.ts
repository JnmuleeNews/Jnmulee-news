import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

function decodeHtml(text: string) {
  return text
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

function stripHtml(text: string) {
  return decodeHtml(text)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getImage(item: string) {
  const decoded = decodeHtml(item);

  // RSS media image
  const mediaContent = decoded.match(
    /<media:content[^>]+url=["']([^"']+)["']/i
  );

  if (mediaContent?.[1]) {
    return mediaContent[1];
  }

  // RSS media thumbnail
  const mediaThumbnail = decoded.match(
    /<media:thumbnail[^>]+url=["']([^"']+)["']/i
  );

  if (mediaThumbnail?.[1]) {
    return mediaThumbnail[1];
  }

  // RSS enclosure image
  const enclosure = decoded.match(
    /<enclosure[^>]+url=["']([^"']+)["']/i
  );

  if (enclosure?.[1]) {
    return enclosure[1];
  }

  // Image inside description/content
  const img = decoded.match(
    /<img[^>]+src=["']([^"']+)["']/i
  );

  if (img?.[1]) {
    return img[1];
  }

  // Try schema:image
  const schemaImage = decoded.match(
    /property=["']schema:image["'][^>]+src=["']([^"']+)["']/i
  );

  if (schemaImage?.[1]) {
    return schemaImage[1];
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
    const { data: sources, error: sourceError } =
      await supabase
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
    let skippedNoImage = 0;

    for (const source of sources ?? []) {
      try {
        const response = await fetch(source.feed_url, {
          headers: {
            "User-Agent": "JNMulee-News/1.0",
            Accept:
              "application/rss+xml, application/xml, text/xml, */*",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          continue;
        }

        const xml = await response.text();

        const items = [
          ...xml.matchAll(/<item[\s\S]*?<\/item>/gi),
        ];

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

          if (!titleMatch || !linkMatch) {
            continue;
          }

          const title = stripHtml(titleMatch[1]);
          const link = stripHtml(linkMatch[1]);

          const description = descriptionMatch
            ? descriptionMatch[1]
            : "";

          if (!title || !link) {
            continue;
          }

          const { data: