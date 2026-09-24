import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const MAX_FEED_ITEMS_PER_SOURCE = 20;
const ARTICLE_PAGE_TIMEOUT_MS = 15000;
const MAX_ARTICLE_PAGE_CHARS = 100000;
const MAX_COMBINED_SOURCE_CHARS = 120000;

const MIN_PAGE_WORDS = 100;
const MIN_SOURCE_WORDS_FOR_AI = 180;
const MIN_FINAL_WORDS = 180;

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

type FeedItem = {
  title: string;
  link: string;
  description: string;
  content: string;
  imageUrl: string;
  category: string;
  pubDate: string;
};

type SourceRow = {
  id: string;
  name: string;
  feed_url: string;
  active: boolean;
  category?: string | null;
};

function decodeHtml(value: string): string {
  if (!value) return "";

  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCharCode(Number(n));
      } catch {
        return "";
      }
    });
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wordCount(value: string): number {
  return normalizeWhitespace(value)
    .split(/\s+/)
    .filter(Boolean).length;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

function dedupeParagraphs(text: string): string {
  const paragraphs = normalizeWhitespace(text)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const output: string[] = [];

  for (const paragraph of paragraphs) {
    const key = paragraph
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();

    if (!key || key.length < 15) continue;

    if (seen.has(key)) continue;

    seen.add(key);
    output.push(paragraph);
  }

  return output.join("\n\n");
}

/**
 * Removes source attribution and promotional language from imported text.
 *
 * IMPORTANT:
 * Source metadata remains stored separately in:
 * source_url
 * source_name
 * canonical_url
 * attribution_text
 *
 * These values are NOT inserted into the article body.
 */
function removeSourceAttributionText(text: string): string {
  let output = text;

  const patterns = [
    /(?:this\s+story\s+)?continues\s+at\s+[^\n]+/gi,
    /this\s+story\s+continues\s+at[^\n]*/gi,
    /read\s+more\s*:?[^\n]*/gi,
    /read\s+the\s+full\s+story\s*:?[^\n]*/gi,
    /read\s+the\s+full\s+article\s*:?[^\n]*/gi,
    /originally\s+published\s+(?:by|on|at)[^\n]*/gi,
    /original\s+source\s*:?[^\n]*/gi,
    /article\s+source\s*:?[^\n]*/gi,
    /source\s*:?[ \t]*(?:https?:\/\/|www\.)[^\n]*/gi,
    /via\s*:?[ \t]*(?:https?:\/\/|www\.)[^\n]*/gi,
    /courtesy\s+of[^\n]*/gi,
    /published\s+by[^\n]*/gi,
    /first\s+published\s+by[^\n]*/gi,
    /follow\s+us[^\n]*/gi,
    /follow\s+us\s+on[^\n]*/gi,
    /subscribe\s+to[^\n]*/gi,
    /subscribe\s+now[^\n]*/gi,
    /sign\s+up\s+for[^\n]*/gi,
    /join\s+our\s+newsletter[^\n]*/gi,
    /newsletter[^\n]*/gi,
    /click\s+here[^\n]*/gi,
    /visit\s+our\s+website[^\n]*/gi,
    /visit\s+[a-z0-9.-]+\.[a-z]{2,}[^\n]*/gi,
  ];

  for (const pattern of patterns) {
    output = output.replace(pattern, "");
  }

  output = output.replace(
    /\bhttps?:\/\/[^\s<>"']+/gi,
    ""
  );

  output = output.replace(
    /\bwww\.[^\s<>"']+/gi,
    ""
  );

  return normalizeWhitespace(output);
}

/**
 * Removes author biography/author-profile material.
 */
function removeAuthorBiography(text: string): string {
  let output = text;

  const patterns = [
    /about\s+the\s+author[\s\S]{0,1500}/gi,
    /author\s+bio[\s\S]{0,1500}/gi,
    /author\s+biography[\s\S]{0,1500}/gi,
    /author\s+description[\s\S]{0,1500}/gi,
    /meet\s+the\s+author[\s\S]{0,1500}/gi,
    /written\s+by\s+[^\n]{1,150}/gi,
    /by\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,4}\s*(?:\||-)?\s*(?:edited|updated|published)[^\n]*/g,
    /journalist\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,5}\s+has\s+over\s+\d+\s+years[^\n]*/gi,
    /journalist\s+[A-Z][A-Za-z.'-]+[^\n]{0,300}\bexperience\s+covering\b[^\n]*/gi,
    /reporter\s+[A-Z][A-Za-z.'-]+[^\n]{0,300}\bexperience\s+covering\b[^\n]*/gi,
    /editor\s+[A-Z][A-Za-z.'-]+[^\n]{0,300}\bexperience\s+covering\b[^\n]*/gi,
  ];

  for (const pattern of patterns) {
    output = output.replace(pattern, "");
  }

  return normalizeWhitespace(output);
}

/**
 * Removes obvious advertisements and website promotional blocks.
 */
function removeAdvertisingText(text: string): string {
  let output = text;

  const patterns = [
    /advertisement[\s\S]{0,500}/gi,
    /advertisements[\s\S]{0,500}/gi,
    /sponsored\s+content[\s\S]{0,500}/gi,
    /sponsored[\s:,-]*[\s\S]{0,300}/gi,
    /promoted\s+content[\s\S]{0,500}/gi,
    /paid\s+partnership[\s\S]{0,500}/gi,
    /pay\s+attention[\s\S]{0,500}/gi,
    /find\s+it\s+fast[\s\S]{0,500}/gi,
    /mark\s+[a-z0-9.-]+\s+as\s+a\s+preferred\s+source[\s\S]{0,500}/gi,
    /download\s+our\s+app[\s\S]{0,500}/gi,
    /get\s+our\s+app[\s\S]{0,500}/gi,
    /install\s+our\s+app[\s\S]{0,500}/gi,
    /enable\s+notifications[\s\S]{0,300}/gi,
    /turn\s+on\s+notifications[\s\S]{0,300}/gi,
    /accept\s+cookies[\s\S]{0,300}/gi,
    /cookie\s+policy[\s\S]{0,300}/gi,
  ];

  for (const pattern of patterns) {
    output = output.replace(pattern, "");
  }

  return normalizeWhitespace(output);
}

/**
 * Removes navigation, related content, and other website furniture.
 */
function removeWebsiteFurniture(text: string): string {
  let output = text;

  const blocks = [
    /related\s+(?:stories|articles|news|posts)[\s\S]{0,3000}/gi,
    /you\s+may\s+also\s+like[\s\S]{0,3000}/gi,
    /you\s+might\s+also\s+like[\s\S]{0,3000}/gi,
    /recommended\s+(?:for\s+you|articles|stories)[\s\S]{0,3000}/gi,
    /most\s+read[\s\S]{0,3000}/gi,
    /latest\s+news[\s\S]{0,3000}/gi,
    /popular\s+stories[\s\S]{0,3000}/gi,
    /trending\s+(?:stories|news)[\s\S]{0,3000}/gi,
    /read\s+next[\s\S]{0,3000}/gi,
    /more\s+from\s+[A-Za-z0-9 .'-]+[\s\S]{0,3000}/gi,
    /table\s+of\s+contents[\s\S]{0,2500}/gi,
    /share\s+this\s+(?:article|story)[\s\S]{0,1000}/gi,
    /copy\s+link[\s\S]{0,500}/gi,
    /link\s+copied[\s\S]{0,500}/gi,
    /sign\s+in[\s\S]{0,300}/gi,
    /log\s+in[\s\S]{0,300}/gi,
    /create\s+an\s+account[\s\S]{0,300}/gi,
    /live\s+radio[\s\S]{0,1000}/gi,
    /view\s+all\s+results[\s\S]{0,500}/gi,
    /no\s+result[\s\S]{0,500}/gi,
  ];

  for (const pattern of blocks) {
    output = output.replace(pattern, "");
  }

  return normalizeWhitespace(output);
}

function cleanText(value: string): string {
  let output = decodeHtml(value);

  output = output.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  output = output.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  output = output.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
  output = output.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
  output = output.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "");
  output = output.replace(/<canvas\b[^>]*>[\s\S]*?<\/canvas>/gi, "");

  output = output.replace(/<\/p\s*>/gi, "\n\n");
  output = output.replace(/<\/div\s*>/gi, "\n");
  output = output.replace(/<br\s*\/?>/gi, "\n");

  output = output.replace(/<[^>]+>/g, " ");

  output = output
    .replace(/&[#a-z0-9]+;/gi, (entity) => decodeHtml(entity))
    .replace(/\u00a0/g, " ");

  output = removeAuthorBiography(output);
  output = removeAdvertisingText(output);
  output = removeWebsiteFurniture(output);
  output = removeSourceAttributionText(output);

  output = output.replace(
    /^\s*(share|comments?|advertisement|subscribe|follow us)\s*$/gim,
    ""
  );

  output = output.replace(
    /^\s*(home|news|sports|business|technology|politics|entertainment|gossip)\s*$/gim,
    ""
  );

  output = normalizeWhitespace(output);
  output = dedupeParagraphs(output);

  return output;
}

function extractTag(
  xml: string,
  tagNames: string[]
): string {
  for (const tag of tagNames) {
    const regex = new RegExp(
      `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    );

    const match = xml.match(regex);

    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }

  return "";
}

function extractAttr(
  xml: string,
  tagNames: string[],
  attr: string
): string {
  for (const tag of tagNames) {
    const regex = new RegExp(
      `<${tag}\\b[^>]*\\b${attr}\\s*=\\s*["']([^"']+)["'][^>]*>`,
      "i"
    );

    const match = xml.match(regex);

    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }

  return "";
}

function extractImage(raw: string): string {
  const candidates: string[] = [];

  const add = (value: string) => {
    const cleaned = decodeHtml(value || "").trim();

    if (
      cleaned &&
      /^https?:\/\//i.test(cleaned) &&
      !candidates.includes(cleaned)
    ) {
      candidates.push(cleaned);
    }
  };

  add(
    extractAttr(
      raw,
      ["media:content", "media:thumbnail", "enclosure"],
      "url"
    )
  );

  const mediaRegex =
    /<(?:media:content|media:thumbnail|enclosure)\b[^>]*\burl\s*=\s*["']([^"']+)["'][^>]*>/gi;

  let match: RegExpExecArray | null;

  while ((match = mediaRegex.exec(raw)) !== null) {
    add(match[1]);
  }

  const imageRegex =
    /<img\b[^>]*(?:src|data-src|data-original)\s*=\s*["']([^"']+)["'][^>]*>/gi;

  while ((match = imageRegex.exec(raw)) !== null) {
    add(match[1]);
  }

  const srcsetRegex =
    /\bsrcset\s*=\s*["']([^"']+)["']/gi;

  while ((match = srcsetRegex.exec(raw)) !== null) {
    const first = match[1]
      .split(",")
      .map((item) => item.trim().split(/\s+/)[0])
      .find((item) => /^https?:\/\//i.test(item));

    if (first) add(first);
  }

  return candidates[0] || "";
}

function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];

  const itemRegex =
    /<item\b[^>]*>([\s\S]*?)<\/item>/gi;

  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const raw = match[1];

    const title = extractTag(raw, ["title"]);
    const link =
      extractTag(raw, ["link"]) ||
      extractAttr(raw, ["atom:link", "link"], "href");

    const description = extractTag(raw, [
      "description",
      "summary",
    ]);

    const content = extractTag(raw, [
      "content:encoded",
      "content",
    ]);

    const pubDate = extractTag(raw, [
      "pubDate",
      "dc:date",
      "published",
      "updated",
    ]);

    const category = extractTag(raw, ["category"]);

    const imageUrl = extractImage(raw);

    if (!title || !link) continue;

    items.push({
      title: cleanText(title),
      link: link.trim(),
      description: cleanText(description),
      content: cleanText(content),
      imageUrl,
      category: cleanText(category),
      pubDate,
    });
  }

  if (items.length > 0) {
    return items;
  }

  const entryRegex =
    /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;

  while ((match = entryRegex.exec(xml)) !== null) {
    const raw = match[1];

    const title = extractTag(raw, ["title"]);

    const link =
      extractAttr(raw, ["link"], "href") ||
      extractTag(raw, ["link"]);

    const description = extractTag(raw, [
      "summary",
      "description",
    ]);

    const content = extractTag(raw, [
      "content",
      "content:encoded",
    ]);

    const pubDate = extractTag(raw, [
      "published",
      "updated",
    ]);

    const category = extractAttr(
      raw,
      ["category"],
      "term"
    );

    const imageUrl = extractImage(raw);

    if (!title || !link) continue;

    items.push({
      title: cleanText(title),
      link: link.trim(),
      description: cleanText(description),
      content: cleanText(content),
      imageUrl,
      category: cleanText(category),
      pubDate,
    });
  }

  return items;
}

function classifyCategory(
  title: string,
  content: string,
  sourceCategory?: string | null
): string {
  const combined =
    `${title} ${content} ${sourceCategory || ""}`.toLowerCase();

  const source = (sourceCategory || "").toLowerCase();

  if (source.includes("sport")) return "Sports";
  if (source.includes("politic")) return "Politics";
  if (source.includes("business")) return "Business";
  if (source.includes("tech")) return "Technology";
  if (source.includes("crypto")) return "Crypto";
  if (source.includes("gossip")) return "Gossip";
  if (source.includes("entertainment")) return "Entertainment";
  if (source.includes("nigeria")) return "Nigeria";
  if (source.includes("world")) return "World";

  const rules: Array<[string, RegExp]> = [
    [
      "Sports",
      /\b(football|soccer|nba|nfl|tennis|cricket|afcon|fifa|premier league|champions league|super eagles|arsenal|chelsea|liverpool|manchester united|real madrid|barcelona)\b/i,
    ],
    [
      "Crypto",
      /\b(bitcoin|ethereum|crypto|cryptocurrency|blockchain|stablecoin|defi|binance|coinbase|solana)\b/i,
    ],
    [
      "Technology",
      /\b(ai|artificial intelligence|technology|tech|software|iphone|android|google|microsoft|apple|openai|robotics|chip|semiconductor|cybersecurity)\b/i,
    ],
    [
      "Business",
      /\b(stock|stocks|market|markets|investor|investors|company|companies|bank|banking|economy|economic|finance|business|shares|nasdaq|nyse)\b/i,
    ],
    [
      "Politics",
      /\b(president|presidential|election|elections|senate|senator|congress|governor|politician|politics|government|party|apc|pdp|inec|parliament)\b/i,
    ],
    [
      "Gossip",
      /\b(celebrity|celebrities|viral|rumor|rumour|dating|relationship|breakup|social media|fans|instagram|tiktok)\b/i,
    ],
    [
      "Entertainment",
      /\b(movie|movies|film|films|music|singer|actor|actress|album|concert|hollywood|nollywood|netflix)\b/i,
    ],
    [
      "Nigeria",
      /\b(nigeria|nigerian|lagos|abuja|kano|rivers state|anambra|enugu|kaduna|ibadan|yoruba|igbo|naira)\b/i,
    ],
  ];

  for (const [category, regex] of rules) {
    if (regex.test(combined)) {
      return category;
    }
  }

  return "News";
}

function extractJsonLdArticleBody(html: string): string {
  const scripts: string[] = [];

  const regex =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    scripts.push(match[1]);
  }

  const bodies: string[] = [];

  const walk = (value: unknown) => {
    if (!value) return;

    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }

    if (typeof value !== "object") return;

    const object = value as Record<string, unknown>;

    if (
      typeof object.articleBody === "string" &&
      wordCount(object.articleBody) >= 50
    ) {
      bodies.push(object.articleBody);
    }

    for (const key of [
      "@graph",
      "mainEntity",
      "mainEntityOfPage",
      "article",
      "item",
    ]) {
      if (object[key]) {
        walk(object[key]);
      }
    }
  };

  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(
        raw.trim().replace(/^\uFEFF/, "")
      );

      walk(parsed);
    } catch {
      // Ignore malformed JSON-LD.
    }
  }

  if (!bodies.length) return "";

  bodies.sort(
    (a, b) => wordCount(b) - wordCount(a)
  );

  return cleanText(bodies[0]);
}

function extractArticleContainers(html: string): string[] {
  const candidates: string[] = [];

  const patterns = [
    /<article\b[^>]*>([\s\S]*?)<\/article>/gi,
    /<main\b[^>]*>([\s\S]*?)<\/main>/gi,

    /<(?:div|section)\b[^>]*(?:class|id)=["'][^"']*(?:article-body|article__body|article-content|article__content|post-content|entry-content|story-body|story__body|content-body|c-bodyNews__article|news-content|single-content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(html)) !== null) {
      if (match[1]) {
        candidates.push(match[1]);
      }
    }
  }

  return candidates;
}

function scoreArticleCandidate(
  text: string,
  title: string
): number {
  const words = wordCount(text);

  if (words < 50) return -Infinity;

  const paragraphs = text
    .split(/\n{2,}/)
    .filter(Boolean).length;

  const titleWords = title
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3);

  const lower = text.toLowerCase();

  let score =
    words * 1.5 +
    paragraphs * 12;

  for (const titleWord of titleWords) {
    if (lower.includes(titleWord)) {
      score += 5;
    }
  }

  const penalties = [
    "sign up",
    "subscribe",
    "newsletter",
    "related stories",
    "related articles",
    "most read",
    "latest news",
    "follow us",
    "advertisement",
    "cookie policy",
    "privacy policy",
    "terms of use",
    "all rights reserved",
    "share this",
    "read next",
    "you may also like",
    "table of contents",
    "live radio",
  ];

  for (const phrase of penalties) {
    if (lower.includes(phrase)) {
      score -= 100;
    }
  }

  return score;
}

async function fetchArticlePage(
  url: string,
  title: string
): Promise<{
  text: string;
  imageUrl: string;
}> {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, ARTICLE_PAGE_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; JNMuleeNewsBot/1.0; +https://jnmulee-news-jnnation.vercel.app)",
        Accept:
          "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        text: "",
        imageUrl: "",
      };
    }

    const html = await response.text();

    if (!html) {
      return {
        text: "",
        imageUrl: "",
      };
    }

    const limitedHtml =
      html.length > MAX_ARTICLE_PAGE_CHARS
        ? html.slice(0, MAX_ARTICLE_PAGE_CHARS)
        : html;

    const pageImage = extractImage(limitedHtml);

    const jsonLdBody =
      extractJsonLdArticleBody(limitedHtml);

    const candidates =
      extractArticleContainers(limitedHtml);

    const cleanedCandidates = candidates
      .map((candidate) => cleanText(candidate))
      .filter(
        (candidate) =>
          wordCount(candidate) >= 50
      );

    let bestText = "";

    if (cleanedCandidates.length) {
      cleanedCandidates.sort(
        (a, b) =>
          scoreArticleCandidate(b, title) -
          scoreArticleCandidate(a, title)
      );

      bestText = cleanedCandidates[0];
    }

    if (
      wordCount(jsonLdBody) >
      wordCount(bestText)
    ) {
      bestText = jsonLdBody;
    }

    if (wordCount(bestText) < MIN_PAGE_WORDS) {
      const bodyMatch =
        limitedHtml.match(
          /<body\b[^>]*>([\s\S]*?)<\/body>/i
        );

      if (bodyMatch?.[1]) {
        const bodyText = cleanText(
          bodyMatch[1]
        );

        if (
          wordCount(bodyText) >
          wordCount(bestText)
        ) {
          bestText = bodyText;
        }
      }
    }

    bestText = removeAuthorBiography(bestText);
    bestText = removeAdvertisingText(bestText);
    bestText = removeWebsiteFurniture(bestText);
    bestText = removeSourceAttributionText(bestText);
    bestText = dedupeParagraphs(bestText);

    return {
      text: bestText,
      imageUrl: pageImage,
    };
  } catch {
    return {
      text: "",
      imageUrl: "",
    };
  }
}

function buildSourceMaterial(
  item: FeedItem,
  pageText: string
): string {
  const parts: string[] = [];

  if (pageText) {
    parts.push(
      `FULL ARTICLE MATERIAL:\n${pageText}`
    );
  }

  if (item.content) {
    parts.push(
      `RSS ARTICLE MATERIAL:\n${item.content}`
    );
  }

  if (item.description) {
    parts.push(
      `RSS SUMMARY:\n${item.description}`
    );
  }

  let combined = parts.join("\n\n");

  combined = removeAuthorBiography(combined);
  combined = removeAdvertisingText(combined);
  combined = removeWebsiteFurniture(combined);
  combined = removeSourceAttributionText(combined);
  combined = dedupeParagraphs(combined);

  if (
    combined.length >
    MAX_COMBINED_SOURCE_CHARS
  ) {
    combined = combined.slice(
      0,
      MAX_COMBINED_SOURCE_CHARS
    );
  }

  return combined;
}

function sanitizeArticleHtml(
  html: string
): string {
  let output = html;

  output = output.replace(
    /<(script|style|iframe|object|embed|form|nav|header|footer|aside|noscript|svg|canvas|button|input|textarea|select|option|figure|figcaption)\b[^>]*>[\s\S]*?<\/\1>/gi,
    ""
  );

  output = output.replace(
    /<a\b[^>]*>([\s\S]*?)<\/a>/gi,
    "$1"
  );

  output = output.replace(
    /<img\b[^>]*>/gi,
    ""
  );

  output = output.replace(
    /<video\b[^>]*>[\s\S]*?<\/video>/gi,
    ""
  );

  output = output.replace(
    /<audio\b[^>]*>[\s\S]*?<\/audio>/gi,
    ""
  );

  output = output.replace(
    /<\/?(?!p\b|h2\b|h3\b|strong\b|em\b|ul\b|ol\b|li\b|blockquote\b|br\b)[^>]+>/gi,
    ""
  );

  return output.trim();
}

function removeSourceAttributionHtml(
  html: string
): string {
  let output = html;

  output = output.replace(
    /<p[^>]*>\s*(?:originally\s+published|original\s+source|article\s+source|source|via|courtesy|read\s+more|this\s+story\s+continues|follow\s+us|subscribe)[\s\S]*?<\/p>/gi,
    ""
  );

  output = output.replace(
    /<p[^>]*>\s*(?:written\s+by|by)\s+[^<]{1,180}<\/p>/gi,
    ""
  );

  output = output.replace(
    /<p[^>]*>\s*(?:about\s+the\s+author|author\s+bio|author\s+biography)[\s\S]*?<\/p>/gi,
    ""
  );

  output = output.replace(
    /https?:\/\/[^\s<>"']+/gi,
    ""
  );

  return output.trim();
}

function cleanFinalArticleText(
  value: string
): string {
  let output = decodeHtml(value);

  output = removeAuthorBiography(output);
  output = removeAdvertisingText(output);
  output = removeWebsiteFurniture(output);
  output = removeSourceAttributionText(output);

  output = output.replace(
    /^(?:title|headline)\s*:\s*/i,
    ""
  );

  output = output.replace(
    /^(?:article|story|content)\s*:\s*/i,
    ""
  );

  output = output.replace(
    /^(?:source|sources|original source|article source)\s*:.*$/gim,
    ""
  );

  output = output.replace(
    /https?:\/\/\S+/gi,
    ""
  );

  output = output.replace(
    /www\.\S+/gi,
    ""
  );

  output = normalizeWhitespace(output);
  output = dedupeParagraphs(output);

  return output;
}

function textToHtml(text: string): string {
  let output = cleanFinalArticleText(text);

  const blocks = output
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const htmlBlocks: string[] = [];

  for (const block of blocks) {
    if (/^##\s+/.test(block)) {
      htmlBlocks.push(
        `<h2>${escapeHtml(
          block.replace(/^##\s+/, "")
        )}</h2>`
      );
      continue;
    }

    if (/^###\s+/.test(block)) {
      htmlBlocks.push(
        `<h3>${escapeHtml(
          block.replace(/^###\s+/, "")
        )}</h3>`
      );
      continue;
    }

    if (/^[-*]\s+/.test(block)) {
      const items = block
        .split(/\n/)
        .map((line) =>
          line.replace(/^[-*]\s+/, "").trim()
        )
        .filter(Boolean);

      htmlBlocks.push(
        `<ul>${items
          .map(
            (item) =>
              `<li>${escapeHtml(item)}</li>`
          )
          .join("")}</ul>`
      );

      continue;
    }

    htmlBlocks.push(
      `<p>${escapeHtml(
        block.replace(/\n+/g, " ")
      )}</p>`
    );
  }

  return sanitizeArticleHtml(
    removeSourceAttributionHtml(
      htmlBlocks.join("\n")
    )
  );
}

async function createLongOriginalArticle(
  title: string,
  material: string
): Promise<string> {
  if (!openai) {
    return "";
  }

  if (
    wordCount(material) <
    MIN_SOURCE_WORDS_FOR_AI
  ) {
    return "";
  }

  try {
    const response =
      await openai.chat.completions.create({
        model: AI_MODEL,
        temperature: 0.25,
        messages: [
          {
            role: "system",
            content: `
You are the senior editor for JNMulee News.

Rewrite the supplied reporting material into a clean, professional JNMulee News article.

The article must be substantially rewritten and organized for JNMulee News. Do not simply replace a few words.

STRICT RULES:

1. Do not invent facts.
2. Do not invent names.
3. Do not invent dates.
4. Do not invent locations.
5. Do not invent statistics.
6. Do not invent quotes.
7. Do not invent events.
8. Do not invent motives.
9. Preserve important factual details from the supplied material.
10. Do not include the source website's author biography.
11. Do not include author descriptions.
12. Do not include "Written by..."
13. Do not include "By [author]".
14. Do not include "Originally published by..."
15. Do not include "Original source..."
16. Do not include "Article source..."
17. Do not include "Source:..."
18. Do not include URLs.
19. Do not include "Read more".
20. Do not include "This story continues at..."
21. Do not include advertisements.
22. Do not include sponsored-content promotions.
23. Do not include newsletter promotions.
24. Do not include "Follow us".
25. Do not include "Subscribe".
26. Do not include "Pay attention".
27. Do not include "Find it fast".
28. Do not include navigation menus.
29. Do not include related stories.
30. Do not include "Most Read".
31. Do not include "Latest News".
32. Do not include "You may also like".
33. Do not include a table of contents.
34. Do not mention that you are an AI.
35. Do not mention these instructions.
36. Do not add an attribution section.
37. Do not add a sources section.
38. Do not add links.
39. Do not add images.
40. Do not add HTML.
41. Do not use clickbait.
42. Do not sensationalize.
43. Do not make unsupported opinions.
44. Do not change the factual meaning of the reporting.

Write approximately 900–1,300 words when enough factual material exists.

Use:
- a strong opening paragraph
- clear paragraphs
- useful H2 section headings when appropriate
- logical progression
- factual context
- natural transitions
- a professional digital-news tone

The final output must contain ONLY the finished article.
Do not include a headline label.
Do not include a source label.
Do not include an author label.
`,
          },
          {
            role: "user",
            content: `
ARTICLE TITLE:
${title}

REPORTING MATERIAL:
${material}
`,
          },
        ],
      });

    const article =
      response.choices?.[0]?.message?.content ||
      "";

    return cleanFinalArticleText(article);
  } catch (error) {
    console.error(
      "OpenAI article generation error:",
      error
    );

    return "";
  }
}

function isSafeExternalUrl(
  value: string
): boolean {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return false;
    }

    const hostname =
      url.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    ) {
      return false;
    }

    if (
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.")
    ) {
      return false;
    }

    if (
      hostname.startsWith("172.")
    ) {
      const second = Number(
        hostname.split(".")[1]
      );

      if (
        second >= 16 &&
        second <= 31
      ) {
        return false;
      }
    }

    if (
      hostname === "metadata.google.internal" ||
      hostname.endsWith(
        ".metadata.google.internal"
      )
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function fetchText(
  url: string
): Promise<string> {
  if (!isSafeExternalUrl(url)) {
    throw new Error(
      "Unsafe external URL"
    );
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, ARTICLE_PAGE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; JNMuleeNewsBot/1.0)",
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Feed request failed: ${response.status}`
      );
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const startedAt = Date.now();

  let sourcesProcessed = 0;
  let feedItemsSeen = 0;
  let articlesPublished = 0;
  let articlesSkipped = 0;
  let skippedNoImage = 0;
  let skippedInsufficientContent = 0;
  let skippedDuplicate = 0;
  let articlePagesFetched = 0;
  let articlePagesFailed = 0;
  let aiGenerated = 0;
  let fallbackPublished = 0;

  const errors: string[] = [];

  try {
    const {
      data: sources,
      error: sourceError,
    } = await supabase
      .from("sources")
      .select(
        "id,name,feed_url,active,category"
      )
      .eq("active", true)
      .order("name", {
        ascending: true,
      });

    if (sourceError) {
      console.error(
        "Source lookup error:",
        sourceError
      );

      return NextResponse.json(
        {
          success: false,
          error: sourceError.message,
        },
        { status: 500 }
      );
    }

    for (const source of (sources ||
      []) as SourceRow[]) {
      sourcesProcessed++;

      if (
        !source.feed_url ||
        !isSafeExternalUrl(
          source.feed_url
        )
      ) {
        errors.push(
          `${source.name}: invalid feed URL`
        );
        continue;
      }

      try {
        const xml = await fetchText(
          source.feed_url
        );

        const feedItems =
          parseFeed(xml).slice(
            0,
            MAX_FEED_ITEMS_PER_SOURCE
          );

        feedItemsSeen += feedItems.length;

        for (const item of feedItems) {
          try {
            const title = cleanText(
              item.title
            );

            if (!title || !item.link) {
              articlesSkipped++;
              continue;
            }

            if (
              !isSafeExternalUrl(
                item.link
              )
            ) {
              articlesSkipped++;
              continue;
            }

            /**
             * IMAGE IS REQUIRED.
             *
             * If RSS has no image, the article page
             * gets a chance to provide one.
             */
            let imageUrl =
              item.imageUrl;

            let pageText = "";

            const pageResult =
              await fetchArticlePage(
                item.link,
                title
              );

            articlePagesFetched++;

            pageText =
              pageResult.text;

            if (
              !imageUrl &&
              pageResult.imageUrl
            ) {
              imageUrl =
                pageResult.imageUrl;
            }

            if (
              !imageUrl ||
              !/^https?:\/\//i.test(
                imageUrl
              )
            ) {
              skippedNoImage++;
              articlesSkipped++;
              continue;
            }

            /**
             * Make sure the article image itself
             * is an external HTTP/HTTPS image.
             */
            if (
              !isSafeExternalUrl(
                imageUrl
              )
            ) {
              skippedNoImage++;
              articlesSkipped++;
              continue;
            }

            const {
              data: existing,
              error: duplicateError,
            } = await supabase
              .from("news")
              .select("id")
              .eq(
                "source_url",
                item.link
              )
              .limit(1);

            if (duplicateError) {
              console.error(
                "Duplicate check error:",
                duplicateError
              );
            }

            if (
              existing &&
              existing.length > 0
            ) {
              skippedDuplicate++;
              articlesSkipped++;
              continue;
            }

            const rssMaterial = [
              item.content,
              item.description,
            ]
              .filter(Boolean)
              .join("\n\n");

            const cleanedPageText =
              cleanText(pageText);

            const sourceMaterial =
              buildSourceMaterial(
                {
                  ...item,
                  title,
                  content:
                    cleanText(
                      item.content
                    ),
                  description:
                    cleanText(
                      item.description
                    ),
                },
                cleanedPageText
              );

            const availableWords =
              wordCount(
                sourceMaterial
              );

            if (
              availableWords <
              MIN_SOURCE_WORDS_FOR_AI &&
              wordCount(
                cleanedPageText
              ) <
                MIN_PAGE_WORDS &&
              wordCount(
                rssMaterial
              ) <
                MIN_SOURCE_WORDS_FOR_AI
            ) {
              skippedInsufficientContent++;
              articlesSkipped++;
              continue;
            }

            const category =
              classifyCategory(
                title,
                sourceMaterial,
                source.category ||
                  item.category
              );

            const finalCategory =
              ALLOWED_CATEGORIES.includes(
                category
              )
                ? category
                : "News";

            let finalArticle = "";

            if (openai) {
              finalArticle =
                await createLongOriginalArticle(
                  title,
                  sourceMaterial
                );

              if (finalArticle) {
                aiGenerated++;
              }
            }

            /**
             * Fallback:
             * only use the full cleaned article page.
             * Never publish a tiny RSS summary.
             */
            if (
              wordCount(
                finalArticle
              ) < MIN_FINAL_WORDS
            ) {
              const fallback =
                cleanFinalArticleText(
                  cleanedPageText
                );

              if (
                wordCount(fallback) >=
                MIN_FINAL_WORDS
              ) {
                finalArticle = fallback;
                fallbackPublished++;
              } else {
                skippedInsufficientContent++;
                articlesSkipped++;
                continue;
              }
            }

            /**
             * Final safety cleanup AFTER AI.
             * This catches unwanted text that AI may
             * have accidentally reproduced.
             */
            finalArticle =
              cleanFinalArticleText(
                finalArticle
              );

            if (
              wordCount(finalArticle) <
              MIN_FINAL_WORDS
            ) {
              skippedInsufficientContent++;
              articlesSkipped++;
              continue;
            }

            const contentHtml =
              textToHtml(finalArticle);

            if (
              wordCount(contentHtml) <
              MIN_FINAL_WORDS
            ) {
              skippedInsufficientContent++;
              articlesSkipped++;
              continue;
            }

            /**
             * Final article-body check.
             *
             * These should NEVER appear in published
             * article content.
             */
            const forbiddenArticleText =
              /originally\s+published|original\s+source|article\s+source|about\s+the\s+author|author\s+bio|author\s+biography|written\s+by|this\s+story\s+continues|read\s+more|follow\s+us|subscribe|advertisement|sponsored\s+content|pay\s+attention|find\s+it\s+fast|related\s+(?:stories|articles)|most\s+read|you\s+may\s+also\s+like/i;

            if (
              forbiddenArticleText.test(
                contentHtml
              )
            ) {
              /**
               * Try one additional cleanup instead of
               * publishing contaminated content.
               */
              finalArticle =
                cleanFinalArticleText(
                  finalArticle
                );

              if (
                forbiddenArticleText.test(
                  finalArticle
                )
              ) {
                articlesSkipped++;
                continue;
              }
            }

            const slugBase =
              slugify(title) ||
              `news-${Date.now()}`;

            let slug = slugBase;

            const {
              data: slugExisting,
            } = await supabase
              .from("news")
              .select("id")
              .eq("slug", slug)
              .limit(1);

            if (
              slugExisting &&
              slugExisting.length > 0
            ) {
              slug = `${slugBase}-${Date.now()
                .toString()
                .slice(-6)}`;
            }

            /**
             * IMPORTANT:
             *
             * Source information stays in metadata,
             * not inside article content.
             */
            const insertPayload = {
              title,
              slug,
              content: contentHtml,
              image_url: imageUrl,
              Published: true,
              source_url: item.link,
              category: finalCategory,

              content_type: "syndicated",
              source_name:
                source.name || null,
              canonical_url: item.link,
              attribution_text:
                source.name
                  ? `Originally published by ${source.name}`
                  : null,
            };

            const {
              error: insertError,
            } = await supabase
              .from("news")
              .insert(insertPayload);

            if (insertError) {
              console.error(
                "News insert error:",
                insertError
              );

              errors.push(
                `${title}: ${insertError.message}`
              );

              continue;
            }

            articlesPublished++;
          } catch (itemError) {
            articlesSkipped++;

            const message =
              itemError instanceof Error
                ? itemError.message
                : String(itemError);

            console.error(
              "Feed item processing error:",
              message
            );

            if (
              errors.length < 20
            ) {
              errors.push(
                `${item.title || "Unknown article"}: ${message}`
              );
            }
          }
        }
      } catch (sourceError) {
        const message =
          sourceError instanceof Error
            ? sourceError.message
            : String(sourceError);

        console.error(
          `Feed error for ${source.name}:`,
          message
        );

        articlePagesFailed++;

        if (errors.length < 20) {
          errors.push(
            `${source.name}: ${message}`
          );
        }
      }
    }

    const durationMs =
      Date.now() - startedAt;

    return NextResponse.json(
      {
        success: true,

        message:
          "News import completed. Only articles with images and sufficient content were published.",

        sourcesProcessed,
        feedItemsSeen,

        articlesPublished,
        articlesSkipped,

        skippedNoImage,
        skippedInsufficientContent,
        skippedDuplicate,

        articlePagesFetched,
        articlePagesFailed,

        aiGenerated,
        fallbackPublished,

        durationMs,

        errors:
          errors.length > 0
            ? errors.slice(0, 20)
            : [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Fetch news route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  }
}