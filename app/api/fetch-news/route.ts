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

function xmlValue(item: string, tag: string) {
  const match = item.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  );

  return match?.[1]
    ?.replace(/<!CDATA\[([\s\S]*?)\]>/g, "$1")
    .trim();
}

function extractImage(item: string) {
  const matches = [
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
      /<image[^>]*>([\s\S]*?)<\/image>/i
    )?.[1],

    item.match(
      /<img[^>]+(?:src|data-src)=["']([^"']+)["']/i
    )?.[1],
  ];

  for (const image of matches) {
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
  const text = `${title} ${description}`.toLowerCase();

  const rules: Array<[string, RegExp]> = [
    [
      "Crypto",
      /\b(crypto|bitcoin|ethereum|blockchain|binance|coinbase|token|defi|nft)\b/i,
    ],

    [
      "Sports",
      /\b(football|soccer|sport|arsenal|chelsea|manchester|liverpool|barcelona|real madrid|nba|nfl|tennis|boxing|ufc|afcon|fifa)\b/i,
    ],

    [
      "Technology",
      /\b(technology|tech|artificial intelligence|\bai\b|iphone|android|google|microsoft|apple|meta|software|cybersecurity|startup|chip)\b/i,
    ],

    [
      "Business",
      /\b(business|economy|economic|market|markets|stock|stocks|finance|bank|banking|investment|investor|company|companies|oil price|naira)\b/i,
    ],

    [
      "Politics",
      /\b(politics|political|president|governor|senate|senator|election|minister|house of representatives|campaign|party|apc|pdp|labour party)\b/i,
    ],

    [
      "Entertainment",
      /\b(entertainment|music|movie|film|actor|actress|celebrity|singer|album|concert|award|hollywood|nollywood)\b/i,
    ],

    [
      "Gossip",
      /\b(gossip|rumour|rumor|relationship|dating|breakup|marriage|controversy)\b/i,
    ],

    [
      "Nigeria",
      /\b(nigeria|nigerian|lagos|abuja|anambra|enugu|imo|delta|rivers|kaduna|kano|oyo)\b/i,
    ],

    [
      "World",
      /\b(world|international|america|american|united states|uk|britain|british|europe|european|china|russia|ukraine|israel|palestine|india)\b/i,
    ],
  ];

  for (const [category, pattern] of rules) {
    if (pattern.test(text)) {
      return category;
    }
  }

  if (ALLOWED_CATEGORIES.includes(sourceCategory || "")) {
    return sourceCategory;
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

  return [
    ...xml.matchAll(
      /<item[\s\S]*