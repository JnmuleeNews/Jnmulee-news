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
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSlug(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);

  return `${base}-${Date.now()}`;
}

function xmlValue(item: string, tag: string) {
  const match = item.match(
    new RegExp(
      `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    )
  );

  return match?.[1]
    ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

function extractImage(item: string) {
  const images = [
    item.match(
      /<media:content[^>]+url=["']([^"']+)["']/i
    )?.[1],

    item.match(
      /<media:thumbnail[^>]+url=["']([^"']+)["']/i
    )?.[1],

    item.match(
      /<enclosure[^>]+url=["']([^"']+)["']/i
    )?.[1],

    item.match(
      /<img[^>]+src=["']([^"']+)["']/i
    )?.[1],

    item.match(
      /<img[^>]+data-src=["']([^"']+)["']/i
    )?.[1],
  ];

  for (const image of images) {
    if (
      image &&
      /^https?:\/\//i.test(image.trim())
    ) {
      return image.trim();
    }
  }

  return null;
}

function classifyCategory(
  title: string,
  description: string,
  sourceCategory: string | null | undefined
) {
  const text =
    `${title} ${description}`.toLowerCase();

  const source = (
    sourceCategory || ""
  ).trim();

  const specificCategories = [
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

  if (specificCategories.includes(source)) {
    return source;
  }

  if (
    /\b(crypto|bitcoin|ethereum|blockchain|binance|coinbase|token|defi|nft|altcoin|solana|xrp)\b/i.test(
      text
    )
  ) {
    return "Crypto";
  }

  if (
    /\b(football|soccer|sport|arsenal|chelsea|manchester|liverpool|barcelona|real madrid|nba|nfl|tennis|boxing|ufc|afcon|fifa|champions league|premier league)\b/i.test(
      text
    )
  ) {
    return "Sports";
  }

  if (
    /\b(technology|tech|artificial intelligence|ai|iphone|android|google|microsoft|apple|meta|software|cybersecurity|startup|chip|robot|robotics|semiconductor)\b/i.test(
      text
    )
  ) {
    return "Technology";
  }

  if (
    /\b(business|economy|economic|market|markets|stock|stocks|finance|bank|banking|investment|investor|company|companies|oil price|naira|inflation|trade|trading)\b/i.test(
      text
    )
  ) {
    return "Business";
  }

  if (
    /\b(politics|political|president|governor|senate|senator|election|minister|house of representatives|campaign|party|apc|pdp|labour party|government|legislator)\b/i.test(
      text
    )
  ) {
    return "Politics";
  }

  if (
    /\b(entertainment|music|movie|film|actor|actress|celebrity|singer|album|concert|award|hollywood|nollywood|music star)\b/i.test(
      text
    )
  ) {
    return "Entertainment";
  }

  if (
    /\b(gossip|rumour|rumor|relationship|dating|breakup|marriage|controversy|love life)\b/i.test(
      text
    )
  ) {
    return "Gossip";
  }

  if (
    /\b(nigeria|nigerian|lagos|abuja|anambra|enugu|imo|delta|rivers|kaduna|kano|oyo|onitsha|port harcourt|ibadan|benin city)\b/i.test(
      text
    )
  ) {
    return "Nigeria";
  }

  if (
    /\b(world|international|america|american|united states|uk|britain|british|europe|european|china|russia|ukraine|israel|palestine|india|canada|australia|france|germany)\b/i.test(
      text
    )
  ) {
    return "World";
  }

  if (ALLOWED_CATEGORIES.includes(source)) {
    return source;
  }

  return "Top Stories";
}

async function parseFeed(feedUrl: string) {
  const response = await fetch(feedUrl, {
    headers: {
      "User-Agent": "JNMuleeNews/1.0",
      Accept:
        "application/rss+xml, application/xml, text/xml",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Feed returned ${response.status}`
    );
  }

  const xml = await response.text();

  const items: string[] = [];

  let start = 0;

  while (true) {
    const itemStart = xml.indexOf(
      "<item",
      start
    );

    if (itemStart === -1) {
      break;
    }

    const itemEnd = xml.indexOf(
      "</item>",
      itemStart
    );

    if (itemEnd === -1) {
      break;
    }

    const item = xml.slice(
      itemStart,
      itemEnd + "</item>".length
    );

    items.push(item);

    start =
      itemEnd + "</item>".length;
  }

  return items;
}

export async function GET() {
  let processed = 0;
  let generated = 0;
  let published = 0;
  let skipped = 0;
  let skippedNoImage = 0;

  const errors: string[] = [];

  try {
    const {
      data: sources,
      error: sourceError,
    } = await supabase
      .from("sources")
      .select("*")
      .eq("active", true);

    if (sourceError) {
      throw sourceError;
    }

    for (const source of sources || []) {
      if (!source.feed_url) {
        continue;
      }

      try {
        const items = await parseFeed(
          source.feed_url
        );

        for (const rawItem of items.slice(0, 20)) {
          processed++;

          const title = cleanText(
            xmlValue(rawItem, "title")
          );

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

          /*
           * NO IMAGE = NO INSERT
           * Stories without a valid image are completely skipped.
           */
          const imageUrl =
            extractImage(rawItem);

          if (!imageUrl) {
            skippedNoImage++;
            continue;
          }

          /*
           * Prevent duplicate stories using source URL.
           */
          const {
            data: duplicate,
            error: duplicateError,
          } = await supabase
            .from("news")
            .select("id")
            .eq("source_url", link)
            .limit(1)
            .maybeSingle();

          if (duplicateError) {
            errors.push(
              `${title}: ${duplicateError.message}`
            );
            continue;
          }

          if (duplicate) {
            skipped++;
            continue;
          }

          /*
           * Automatically categorize the story.
           */
          const category =
            classifyCategory(
              title,
              description,
              source.category
            );

          /*
           * Publish automatically.
           * The Supabase database trigger still prevents
           * publication if image_url is empty.
           */
          const {
            error: insertError,
          } = await supabase
            .from("news")
            .insert({
              title,
              slug: makeSlug(title),
              content:
                description || title,
              image_url: imageUrl,
              Published: true,
              source_url: link,
              category,
            });

          if (insertError) {
            errors.push(
              `${title}: ${insertError.message}`
            );
            continue;
          }

          generated++;
          published++;
        }
      } catch (error) {
        errors.push(
          `${source.name}: ${
            error instanceof Error
              ? error.message
              : "Feed error"
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
        "Feed import completed. Stories with images were automatically categorized and published. Stories without images were skipped.",
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
          error instanceof Error
            ? error.message
            : "Unknown error",
        ],
      },
      {
        status: 500,
      }
    );
  }
}