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
const ARTICLE_TIMEOUT_MS = 15000;
const MAX_ARTICLE_HTML = 100000;
const MAX_SOURCE_MATERIAL = 120000;

const MIN_SOURCE_WORDS = 180;
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
      const number = Number(n);

      if (Number.isFinite(number)) {
        return String.fromCharCode(number);
      }

      return "";
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dedupeParagraphs(value: string): string {
  const paragraphs = normalizeWhitespace(value)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const paragraph of paragraphs) {
    const key = paragraph
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();

    if (key.length < 20) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(paragraph);
  }

  return result.join("\n\n");
}

/**
 * Removes source-site boilerplate.
 *
 * This does NOT remove legitimate references to people who
 * are subjects of the story.
 */
function removeSourceBoilerplate(value: string): string {
  let text = value;

  const patterns = [
    /this\s+story\s+continues\s+at[^\n]*/gi,
    /this\s+story\s+continues[^\n]*/gi,
    /originally\s+published\s+(?:by|on|at)[^\n]*/gi,
    /original\s+source\s*:?[^\n]*/gi,
    /article\s+source\s*:?[^\n]*/gi,
    /^\s*source\s*:\s*[^\n]*$/gim,
    /^\s*via\s*:\s*[^\n]*$/gim,
    /read\s+more\s*:?[^\n]*/gi,
    /read\s+the\s+full\s+story\s*:?[^\n]*/gi,
    /read\s+the\s+full\s+article\s*:?[^\n]*/gi,
    /follow\s+us\s*(?:on)?[^\n]*/gi,
    /subscribe\s+(?:now|today|to)[^\n]*/gi,
    /sign\s+up\s+for[^\n]*/gi,
    /join\s+our\s+newsletter[^\n]*/gi,
    /newsletter\s*:?[^\n]*/gi,
    /click\s+here[^\n]*/gi,
    /visit\s+our\s+website[^\n]*/gi,
    /you\s+may\s+also\s+like[\s\S]{0,2500}/gi,
    /you\s+might\s+also\s+like[\s\S]{0,2500}/gi,
    /related\s+(?:stories|articles|news|posts)[\s\S]{0,2500}/gi,
    /recommended\s+(?:for\s+you|articles|stories)[\s\S]{0,2500}/gi,
    /most\s+read[\s\S]{0,2500}/gi,
    /latest\s+news[\s\S]{0,2500}/gi,
    /popular\s+stories[\s\S]{0,2500}/gi,
    /trending\s+(?:stories|news)[\s\S]{0,2500}/gi,
    /read\s+next[\s\S]{0,2500}/gi,
    /table\s+of\s+contents[\s\S]{0,2500}/gi,
  ];

  for (const pattern of patterns) {
    text = text.replace(pattern, "");
  }

  text = text.replace(
    /\bhttps?:\/\/[^\s<>"']+/gi,
    ""
  );

  text = text.replace(
    /\bwww\.[^\s<>"']+/gi,
    ""
  );

  return normalizeWhitespace(text);
}

/**
 * Removes actual author biography/profile material.
 *
 * It intentionally does not remove normal sentences merely
 * because they contain the word "author".
 */
function removeAuthorBiography(value: string): string {
  let text = value;

  const patterns = [
    /about\s+the\s+author[\s\S]{0,2500}/gi,
    /author\s+bio[\s\S]{0,2500}/gi,
    /author\s+biography[\s\S]{0,2500}/gi,
    /author\s+description[\s\S]{0,2500}/gi,
    /meet\s+the\s+author[\s\S]{0,2500}/gi,
  ];

  for (const pattern of patterns) {
    text = text.replace(pattern, "");
  }

  return normalizeWhitespace(text);
}

function removeAdvertising(value: string): string {
  let text = value;

  const patterns = [
    /advertisement[\s\S]{0,1000}/gi,
    /advertisements[\s\S]{0,1000}/gi,
    /sponsored\s+content[\s\S]{0,1000}/gi,
    /promoted\s+content[\s\S]{0,1000}/gi,
    /paid\s+partnership[\s\S]{0,1000}/gi,
    /download\s+our\s+app[\s\S]{0,700}/gi,
    /get\s+our\s+app[\s\S]{0,700}/gi,
    /install\s+our\s+app[\s\S]{0,700}/gi,
    /enable\s+notifications[\s\S]{0,500}/gi,
    /turn\s+on\s+notifications[\s\S]{0,500}/gi,
    /accept\s+cookies[\s\S]{0,500}/gi,
    /cookie\s+policy[\s\S]{0,700}/gi,
  ];

  for (const pattern of patterns) {
    text = text.replace(pattern, "");
  }

  return normalizeWhitespace(text);
}

function cleanText(value: string): string {
  let text = decodeHtml(value || "");

  text = text.replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    ""
  );

  text = text.replace(
    /<style\b[^>]*>[\s\S]*?<\/style>/gi,
    ""
  );

  text = text.replace(
    /<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,
    ""
  );

  text = text.replace(
    /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
    ""
  );

  text = text.replace(
    /<svg\b[^>]*>[\s\S]*?<\/svg>/gi,
    ""
  );

  text = text.replace(
    /<\/p\s*>/gi,
    "\n\n"
  );

  text = text.replace(
    /<\/div\s*>/gi,
    "\n"
  );

  text = text.replace(
    /<br\s*\/?>/gi,
    "\n"
  );

  text = text.replace(
    /<li\b[^>]*>/gi,
    "\n- "
  );

  text = text.replace(
    /<[^>]+>/g,
    " "
  );

  text = decodeHtml(text);

  text = removeAuthorBiography(text);
  text = removeAdvertising(text);
  text = removeSourceBoilerplate(text);

  text = text.replace(
    /^\s*(home|menu|search|share|comments?|subscribe|advertisement)\s*$/gim,
    ""
  );

  text = normalizeWhitespace(text);
  text = dedupeParagraphs(text);

  return text;
}

function extractTag(
  xml: string,
  tags: string[]
): string {
  for (const tag of tags) {
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

function extractAttribute(
  xml: string,
  tags: string[],
  attribute: string
): string {
  for (const tag of tags) {
    const regex = new RegExp(
      `<${tag}\\b[^>]*\\b${attribute}\\s*=\\s*["']([^"']+)["']`,
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
    const url = decodeHtml(value || "").trim();

    if (
      url &&
      /^https?:\/\//i.test(url) &&
      !candidates.includes(url)
    ) {
      candidates.push(url);
    }
  };

  add(
    extractAttribute(
      raw,
      [
        "media:content",
        "media:thumbnail",
        "enclosure",
      ],
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
    /<img\b[^>]*(?:src|data-src|data-original|data-lazy-src)\s*=\s*["']([^"']+)["'][^>]*>/gi;

  while ((match = imageRegex.exec(raw)) !== null) {
    add(match[1]);
  }

  const srcsetRegex =
    /\bsrcset\s*=\s*["']([^"']+)["']/gi;

  while ((match = srcsetRegex.exec(raw)) !== null) {
    const urls = match[1]
      .split(",")
      .map((x) => x.trim().split(/\s+/)[0]);

    for (const url of urls) {
      if (/^https?:\/\//i.test(url)) {
        add(url);
        break;
      }
    }
  }

  return candidates[0] || "";
}

function parseFeed(xml: string): FeedItem[] {
  const results: FeedItem[] = [];

  const rssItems =
    /<item\b[^>]*>([\s\S]*?)<\/item>/gi;

  let match: RegExpExecArray | null;

  while ((match = rssItems.exec(xml)) !== null) {
    const raw = match[1];

    const title = extractTag(raw, ["title"]);

    const link =
      extractTag(raw, ["link"]) ||
      extractAttribute(
        raw,
        ["atom:link", "link"],
        "href"
      );

    if (!title || !link) continue;

    results.push({
      title: cleanText(title),
      link: link.trim(),
      description: cleanText(
        extractTag(raw, [
          "description",
          "summary",
        ])
      ),
      content: cleanText(
        extractTag(raw, [
          "content:encoded",
          "content",
        ])
      ),
      imageUrl: extractImage(raw),
      category: cleanText(
        extractTag(raw, ["category"])
      ),
      pubDate: extractTag(raw, [
        "pubDate",
        "dc:date",
        "published",
        "updated",
      ]),
    });
  }

  if (results.length > 0) {
    return results;
  }

  const atomEntries =
    /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;

  while (
    (match = atomEntries.exec(xml)) !== null
  ) {
    const raw = match[1];

    const title = extractTag(raw, ["title"]);

    const link =
      extractAttribute(
        raw,
        ["link"],
        "href"
      ) ||
      extractTag(raw, ["link"]);

    if (!title || !link) continue;

    results.push({
      title: cleanText(title),
      link: link.trim(),
      description: cleanText(
        extractTag(raw, [
          "summary",
          "description",
        ])
      ),
      content: cleanText(
        extractTag(raw, [
          "content",
          "content:encoded",
        ])
      ),
      imageUrl: extractImage(raw),
      category: cleanText(
        extractAttribute(
          raw,
          ["category"],
          "term"
        )
      ),
      pubDate: extractTag(raw, [
        "published",
        "updated",
      ]),
    });
  }

  return results;
}

function classifyCategory(
  title: string,
  content: string,
  sourceCategory?: string | null
): string {
  const combined =
    `${title} ${content} ${sourceCategory || ""}`.toLowerCase();

  const source =
    (sourceCategory || "").toLowerCase();

  if (source.includes("sport")) return "Sports";
  if (source.includes("politic")) return "Politics";
  if (source.includes("business")) return "Business";
  if (source.includes("tech")) return "Technology";
  if (source.includes("crypto")) return "Crypto";
  if (source.includes("gossip")) return "Gossip";
  if (source.includes("entertainment"))
    return "Entertainment";
  if (source.includes("nigeria"))
    return "Nigeria";
  if (source.includes("world")) return "World";

  const rules: Array<
    [string, RegExp]
  > = [
    [
      "Sports",
      /\b(football|soccer|nba|nfl|tennis|cricket|fifa|afcon|premier league|champions league|arsenal|chelsea|liverpool|manchester united|real madrid|barcelona)\b/i,
    ],
    [
      "Crypto",
      /\b(bitcoin|ethereum|crypto|cryptocurrency|blockchain|stablecoin|defi|binance|coinbase|solana)\b/i,
    ],
    [
      "Technology",
      /\b(artificial intelligence|technology|tech|software|iphone|android|google|microsoft|apple|openai|robotics|chip|semiconductor|cybersecurity)\b/i,
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
      /\b(celebrity|celebrities|viral|rumor|rumour|dating|relationship|breakup|fans|instagram|tiktok)\b/i,
    ],
    [
      "Entertainment",
      /\b(movie|movies|film|films|music|singer|actor|actress|album|concert|hollywood|nollywood|netflix)\b/i,
    ],
    [
      "Nigeria",
      /\b(nigeria|nigerian|lagos|abuja|kano|anambra|enugu|kaduna|ibadan|yoruba|igbo|naira)\b/i,
    ],
  ];

  for (const [category, regex] of rules) {
    if (regex.test(combined)) {
      return category;
    }
  }

  return "News";
}

function extractJsonLdArticleBody(
  html: string
): string {
  const scripts: string[] = [];

  const regex =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    scripts.push(match[1]);
  }

  const bodies: string[] = [];

  function walk(value: unknown): void {
    if (!value) return;

    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }

    if (
      typeof value !== "object"
    ) {
      return;
    }

    const object =
      value as Record<string, unknown>;

    if (
      typeof object.articleBody ===
        "string" &&
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
  }

  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(
        raw.trim().replace(/^\uFEFF/, "")
      );

      walk(parsed);
    } catch {
      // Ignore invalid JSON-LD.
    }
  }

  if (!bodies.length) {
    return "";
  }

  bodies.sort(
    (a, b) =>
      wordCount(b) - wordCount(a)
  );

  return cleanText(bodies[0]);
}

function extractArticleContainers(
  html: string
): string[] {
  const candidates: string[] = [];

  const patterns = [
    /<article\b[^>]*>([\s\S]*?)<\/article>/gi,

    /<main\b[^>]*>([\s\S]*?)<\/main>/gi,

    /<(?:div|section)\b[^>]*(?:class|id)=["'][^"']*(?:article-body|article__body|article-content|article__content|post-content|entry-content|story-body|story__body|content-body|news-content|single-content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;

    while (
      (match = pattern.exec(html)) !== null
    ) {
      if (match[1]) {
        candidates.push(match[1]);
      }
    }
  }

  return candidates;
}

function scoreCandidate(
  text: string,
  title: string
): number {
  const words = wordCount(text);

  if (words < 50) {
    return -Infinity;
  }

  const paragraphs =
    text.split(/\n{2,}/).filter(Boolean)
      .length;

  const lower = text.toLowerCase();

  const titleWords = title
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3);

  let score =
    words * 1.5 +
    paragraphs * 15;

  for (const word of titleWords) {
    if (lower.includes(word)) {
      score += 4;
    }
  }

  const badPhrases = [
    "newsletter",
    "subscribe",
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
  ];

  for (const phrase of badPhrases) {
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
    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      ARTICLE_TIMEOUT_MS
    );

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; JNMuleeNewsBot/1.0)",
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

    const limited =
      html.length > MAX_ARTICLE_HTML
        ? html.slice(0, MAX_ARTICLE_HTML)
        : html;

    const imageUrl =
      extractImage(limited);

    const jsonLd =
      extractJsonLdArticleBody(limited);

    const candidates =
      extractArticleContainers(limited)
        .map((candidate) =>
          cleanText(candidate)
        )
        .filter(
          (candidate) =>
            wordCount(candidate) >= 50
        );

    let best = "";

    if (candidates.length) {
      candidates.sort(
        (a, b) =>
          scoreCandidate(b, title) -
          scoreCandidate(a, title)
      );

      best = candidates[0];
    }

    if (
      wordCount(jsonLd) >
      wordCount(best)
    ) {
      best = jsonLd;
    }

    if (wordCount(best) < 100) {
      const bodyMatch =
        limited.match(
          /<body\b[^>]*>([\s\S]*?)<\/body>/i
        );

      if (bodyMatch?.[1]) {
        const bodyText =
          cleanText(bodyMatch[1]);

        if (
          wordCount(bodyText) >
          wordCount(best)
        ) {
          best = bodyText;
        }
      }
    }

    best = removeAuthorBiography(best);
    best = removeAdvertising(best);
    best = removeSourceBoilerplate(best);
    best = dedupeParagraphs(best);

    return {
      text: best,
      imageUrl,
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
      `FULL ARTICLE REPORTING:\n${pageText}`
    );
  }

  if (item.content) {
    parts.push(
      `RSS ARTICLE CONTENT:\n${item.content}`
    );
  }

  if (item.description) {
    parts.push(
      `RSS DESCRIPTION:\n${item.description}`
    );
  }

  let material =
    parts.join("\n\n");

  material =
    removeAuthorBiography(material);

  material =
    removeAdvertising(material);

  material =
    removeSourceBoilerplate(material);

  material =
    dedupeParagraphs(material);

  if (
    material.length >
    MAX_SOURCE_MATERIAL
  ) {
    material =
      material.slice(
        0,
        MAX_SOURCE_MATERIAL
      );
  }

  return material;
}

/**
 * Additional final cleanup after AI generation.
 */
function cleanFinalArticle(
  value: string
): string {
  let text = decodeHtml(value || "");

  text = text
    .replace(
      /^(?:headline|title)\s*:\s*/i,
      ""
    )
    .replace(
      /^(?:article|story|content)\s*:\s*/i,
      ""
    );

  text =
    removeAuthorBiography(text);

  text =
    removeAdvertising(text);

  text =
    removeSourceBoilerplate(text);

  text = text.replace(
    /https?:\/\/\S+/gi,
    ""
  );

  text = text.replace(
    /www\.\S+/gi,
    ""
  );

  text = normalizeWhitespace(text);
  text = dedupeParagraphs(text);

  return text;
}

function textToHtml(
  text: string
): string {
  const cleaned =
    cleanFinalArticle(text);

  const blocks =
    cleaned
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

  const html: string[] = [];

  for (const block of blocks) {
    if (/^###\s+/.test(block)) {
      html.push(
        `<h3>${escapeHtml(
          block.replace(
            /^###\s+/,
            ""
          )
        )}</h3>`
      );
      continue;
    }

    if (/^##\s+/.test(block)) {
      html.push(
        `<h2>${escapeHtml(
          block.replace(
            /^##\s+/,
            ""
          )
        )}</h2>`
      );
      continue;
    }

    if (
      block
        .split("\n")
        .every((line) =>
          /^[-*]\s+/.test(line)
        )
    ) {
      const items =
        block
          .split("\n")
          .map((line) =>
            line
              .replace(
                /^[-*]\s+/,
                ""
              )
              .trim()
          )
          .filter(Boolean);

      html.push(
        `<ul>${items
          .map(
            (item) =>
              `<li>${escapeHtml(
                item
              )}</li>`
          )
          .join("")}</ul>`
      );

      continue;
    }

    html.push(
      `<p>${escapeHtml(
        block.replace(
          /\n+/g,
          " "
        )
      )}</p>`
    );
  }

  return html.join("\n");
}

function containsForbiddenContent(
  text: string
): boolean {
  const forbidden =
    /originally\s+published|original\s+source|article\s+source|about\s+the\s+author|author\s+bio|author\s+biography|written\s+by\s+|this\s+story\s+continues|read\s+more|follow\s+us|subscribe\s+now|advertisement|sponsored\s+content|newsletter|related\s+(?:stories|articles)|most\s+read|you\s+may\s+also\s+like|source\s*:/i;

  return forbidden.test(text);
}

function qualityScore(
  text: string
): number {
  const cleaned =
    cleanFinalArticle(text);

  const words =
    wordCount(cleaned);

  if (words < MIN_FINAL_WORDS) {
    return 0;
  }

  const paragraphs =
    cleaned
      .split(/\n{2,}/)
      .filter(Boolean);

  let score = 50;

  if (words >= 250) score += 10;
  if (words >= 400) score += 10;
  if (paragraphs.length >= 5)
    score += 10;

  const sentences =
    cleaned.split(
      /[.!?]+(?:\s+|$)/
    );

  if (sentences.length >= 8) {
    score += 10;
  }

  if (
    containsForbiddenContent(
      cleaned
    )
  ) {
    score -= 40;
  }

  const lower =
    cleaned.toLowerCase();

  const repeatedSentencePenalty =
    sentences.length -
    new Set(
      sentences
        .map((sentence) =>
          sentence
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    ).size;

  score -=
    repeatedSentencePenalty * 15;

  if (
    lower.includes(
      "as an ai"
    ) ||
    lower.includes(
      "i cannot"
    )
  ) {
    score -= 100;
  }

  return Math.max(0, score);
}

async function generateJnmuleeArticle(
  title: string,
  material: string
): Promise<string> {
  if (!openai) {
    console.error(
      "OPENAI_API_KEY is not configured."
    );

    return "";
  }

  if (
    wordCount(material) <
    MIN_SOURCE_WORDS
  ) {
    return "";
  }

  try {
    const response =
      await openai.chat.completions.create(
        {
          model: AI_MODEL,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: `
You are the senior news editor for JNMulee News.

Your job is to turn the supplied reporting material into ONE coherent, professionally written news article.

This is NOT a summarization task and it is NOT a sentence-combining task.

Write the article from scratch using only facts supported by the supplied reporting material.

QUALITY STANDARD:

The finished article must read like a real human-edited digital news report.

It must have:
- a strong but factual opening
- a clear explanation of what happened
- logical paragraphs
- natural transitions
- relevant factual details
- clear chronology when chronology matters
- useful context when that context is present in the supplied material
- a clean ending

Do NOT simply put the source sentences together.

Do NOT copy the source paragraph structure.

Do NOT mechanically preserve awkward wording.

Rewrite the information naturally and coherently.

FACTUAL RULES:

- Never invent facts.
- Never invent names.
- Never invent dates.
- Never invent locations.
- Never invent statistics.
- Never invent quotes.
- Never invent statements.
- Never invent motives.
- Never invent background information.
- Never invent reactions.
- Never guess missing information.
- Never turn speculation into fact.
- If a fact is uncertain in the source, preserve that uncertainty.
- Preserve important numbers exactly.
- Preserve important names exactly.
- Preserve direct quotations accurately when they are necessary.
- Do not manufacture quotations.

LENGTH:

The article must contain at least 180 real words.

Prefer approximately 500–900 words when the supplied reporting material contains enough information.

If the material contains enough verified information for a longer article, use it.

NEVER add filler simply to reach 180 words.

If the supplied material does not contain enough factual information to produce a useful 180-word article, return exactly:

INSUFFICIENT_SOURCE_MATERIAL

Do not try to make a weak article longer by repeating information.

WRITING:

Use normal paragraphs.

Use H2 headings only when they genuinely improve readability.

Do not use an H2 heading for every paragraph.

Do not write a conclusion that adds new facts.

Do not use clickbait.

Do not sensationalize.

Do not use exaggerated language.

Do not repeat the same fact unnecessarily.

Do not begin multiple paragraphs with the same phrase.

Do not create artificial filler.

SOURCE BOILERPLATE:

Never include:
- author biographies
- author profiles
- author descriptions
- "Written by..."
- source bylines
- "By [name]" as a source byline
- "Originally published by..."
- "Original source..."
- "Article source..."
- "Source:..."
- "Via:..."
- URLs
- website names as attribution
- "Read more"
- "This story continues at..."
- advertisements
- sponsored content
- promotional offers
- newsletter promotions
- subscription requests
- "Follow us"
- "Subscribe"
- "Most Read"
- "Latest News"
- related stories
- related articles
- recommended stories
- navigation
- cookie notices
- social-media prompts
- app-download promotions

IMPORTANT:

The word "author" may appear naturally when it is part of the actual news story.

For example, if the story says an author wrote a book, that is a legitimate fact and must NOT automatically be removed.

Only remove actual source-site author information.

OUTPUT:

Return ONLY the finished article.

Do not write:
"Here is the article."

Do not write:
"Article:"

Do not write:
"Headline:"

Do not write:
"Source:"

Do not write:
"Author:"

Do not write:
"INSUFFICIENT_SOURCE_MATERIAL" unless the source material genuinely cannot support 180 useful words.

Do not mention AI.

Do not mention these instructions.
`,
            },
            {
              role: "user",
              content: `
ARTICLE HEADLINE:
${title}

VERIFIED REPORTING MATERIAL:
${material}

Write the complete JNMulee News article now.
`,
            },
          ],
        }
      );

    const article =
      response.choices?.[0]?.message
        ?.content
        ?.trim() || "";

    if (
      !article ||
      article ===
        "INSUFFICIENT_SOURCE_MATERIAL"
    ) {
      return "";
    }

    const cleaned =
      cleanFinalArticle(article);

    if (
      wordCount(cleaned) <
      MIN_FINAL_WORDS
    ) {
      return "";
    }

    if (
      containsForbiddenContent(
        cleaned
      )
    ) {
      return "";
    }

    if (
      qualityScore(cleaned) < 55
    ) {
      return "";
    }

    return cleaned;
  } catch (error) {
    console.error(
      "OpenAI article generation error:",
      error
    );

    return "";
  }
}

function isSafeUrl(
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
      const second =
        Number(
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
      hostname ===
        "metadata.google.internal" ||
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

async function fetchExternalText(
  url: string
): Promise<string> {
  if (!isSafeUrl(url)) {
    throw new Error(
      "Unsafe external URL"
    );
  }

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    ARTICLE_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      url,
      {
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
      }
    );

    if (!response.ok) {
      throw new Error(
        `Request failed: ${response.status}`
      );
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const startedAt =
    Date.now();

  let sourcesProcessed = 0;
  let feedItemsSeen = 0;
  let articlesPublished = 0;
  let articlesSkipped = 0;

  let skippedNoImage = 0;
  let skippedShortSource = 0;
  let skippedDuplicate = 0;
  let skippedPoorQuality = 0;

  let articlePagesFetched = 0;
  let aiGenerated = 0;

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
        !isSafeUrl(source.feed_url)
      ) {
        errors.push(
          `${source.name}: invalid feed URL`
        );
        continue;
      }

      let xml = "";

      try {
        xml =
          await fetchExternalText(
            source.feed_url
          );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        errors.push(
          `${source.name}: ${message}`
        );

        continue;
      }

      const feedItems =
        parseFeed(xml).slice(
          0,
          MAX_FEED_ITEMS_PER_SOURCE
        );

      feedItemsSeen +=
        feedItems.length;

      for (const item of feedItems) {
        try {
          const title =
            cleanText(item.title);

          if (
            !title ||
            !item.link ||
            !isSafeUrl(item.link)
          ) {
            articlesSkipped++;
            continue;
          }

          /**
           * First check whether this source URL
           * has already been imported.
           */
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

          /**
           * Get the complete article page whenever
           * possible. This is important because RSS
           * descriptions are often only a few sentences.
           */
          const page =
            await fetchArticlePage(
              item.link,
              title
            );

          articlePagesFetched++;

          let imageUrl =
            item.imageUrl ||
            page.imageUrl ||
            "";

          /**
           * An image is mandatory.
           */
          if (
            !imageUrl ||
            !isSafeUrl(imageUrl)
          ) {
            skippedNoImage++;
            articlesSkipped++;
            continue;
          }

          const material =
            buildSourceMaterial(
              {
                ...item,
                title,
              },
              page.text
            );

          const materialWords =
            wordCount(material);

          if (
            materialWords <
            MIN_SOURCE_WORDS
          ) {
            skippedShortSource++;
            articlesSkipped++;
            continue;
          }

          const category =
            classifyCategory(
              title,
              material,
              source.category ||
                item.category
            );

          const finalCategory =
            ALLOWED_CATEGORIES.includes(
              category
            )
              ? category
              : "News";

          /**
           * AI must produce a genuinely rewritten,
           * coherent article.
           */
          const article =
            await generateJnmuleeArticle(
              title,
              material
            );

          if (!article) {
            skippedPoorQuality++;
            articlesSkipped++;
            continue;
          }

          const finalWords =
            wordCount(article);

          if (
            finalWords <
            MIN_FINAL_WORDS
          ) {
            skippedPoorQuality++;
            articlesSkipped++;
            continue;
          }

          /**
           * Final article safety check.
           */
          if (
            containsForbiddenContent(
              article
            )
          ) {
            skippedPoorQuality++;
            articlesSkipped++;
            continue;
          }

          const content =
            textToHtml(article);

          if (
            wordCount(content) <
            MIN_FINAL_WORDS
          ) {
            skippedPoorQuality++;
            articlesSkipped++;
            continue;
          }

          /**
           * Create a unique slug.
           */
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
            slug =
              `${slugBase}-${Date.now()
                .toString()
                .slice(-7)}`;
          }

          /**
           * Source information remains metadata.
           *
           * It is NOT placed inside the article body.
           */
          const payload = {
            title,
            slug,
            content,
            image_url: imageUrl,
            Published: true,
            source_url: item.link,
            category: finalCategory,

            content_type:
              "syndicated",

            source_name:
              source.name || null,

            canonical_url:
              item.link,

            attribution_text:
              source.name
                ? `Originally published by ${source.name}`
                : null,
          };

          const {
            error: insertError,
          } = await supabase
            .from("news")
            .insert(payload);

          if (insertError) {
            console.error(
              "News insert error:",
              insertError
            );

            if (
              errors.length < 20
            ) {
              errors.push(
                `${title}: ${insertError.message}`
              );
            }

            continue;
          }

          articlesPublished++;
          aiGenerated++;
        } catch (itemError) {
          articlesSkipped++;

          const message =
            itemError instanceof Error
              ? itemError.message
              : String(itemError);

          console.error(
            "Article processing error:",
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
    }

    const durationMs =
      Date.now() - startedAt;

    return NextResponse.json(
      {
        success: true,

        message:
          "News import completed. Only articles with images and genuine 180+ word editorial content were published.",

        sourcesProcessed,
        feedItemsSeen,

        articlesPublished,
        articlesSkipped,

        skippedNoImage,
        skippedShortSource,
        skippedDuplicate,
        skippedPoorQuality,

        articlePagesFetched,
        aiGenerated,

        durationMs,

        errors:
          errors.slice(0, 20),
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