import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

const OPENAI_MODEL =
  process.env.OPENAI_MODEL || "gpt-4o-mini";

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

/* -------------------------------------------------------------------------- */
/* Basic helpers                                                              */
/* -------------------------------------------------------------------------- */

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wordCount(value: string) {
  return normalizeWhitespace(
    value || ""
  )
    .split(/\s+/)
    .filter(Boolean).length;
}

function uniqueParagraphs(value: string) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of value.split(/\n\s*\n/)) {
    const cleaned = normalizeWhitespace(part);

    if (!cleaned) continue;

    const key = cleaned
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    if (key.length >= 30) {
      if (seen.has(key)) continue;
      seen.add(key);
    }

    result.push(cleaned);
  }

  return result.join("\n\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function makeSlug(title: string) {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 150) || "news";

  return `${base}-${Date.now()}`;
}

/* -------------------------------------------------------------------------- */
/* Remove attribution/promotional text                                        */
/* -------------------------------------------------------------------------- */

function removeSourceAttributionText(value: string) {
  if (!value) return "";

  let text = value;

  text = text.replace(
    /^\s*(source|sources)\s*:\s*.*$/gim,
    ""
  );

  text = text.replace(
    /^\s*(original source|originally published by|originally published on)\s*:\s*.*$/gim,
    ""
  );

  text = text.replace(
    /^\s*(article source|story source|news source)\s*:\s*.*$/gim,
    ""
  );

  text = text.replace(
    /^\s*(read more|read the full story|continue reading|continue reading at|read full story)\s*:?\s*.*$/gim,
    ""
  );

  text = text.replace(
    /^\s*(via|courtesy of|credit|image credit|photo credit)\s*:\s*.*$/gim,
    ""
  );

  text = text.replace(
    /\bthis (story|article|report|reporting) (was )?(originally )?(published|reported|posted) (by|on)\s+[^.!?\n]+[.!?]?/gi,
    ""
  );

  text = text.replace(
    /\boriginally published (by|on)\s+[^.!?\n]+[.!?]?/gi,
    ""
  );

  text = text.replace(
    /\b(read|continue reading|read more|read the full story)\s+(more|on|at)\s+[^.!?\n]+[.!?]?/gi,
    ""
  );

  text = text.replace(
    /\bfor more (information|details|news),?\s+(visit|see|read)\s+[^.!?\n]+[.!?]?/gi,
    ""
  );

  text = text.replace(
    /\b(subscribe to|follow us on|follow us|visit our website|visit us at|more from)\s+[^.!?\n]+[.!?]?/gi,
    ""
  );

  text = text.replace(
    /https?:\/\/[^\s<>"')]+/gi,
    ""
  );

  text = text.replace(
    /\bwww\.[^\s<>"')]+/gi,
    ""
  );

  return normalizeWhitespace(text);
}

/* -------------------------------------------------------------------------- */
/* HTML cleaning                                                              */
/* -------------------------------------------------------------------------- */

function removeUnwantedHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<canvas[\s\S]*?<\/canvas>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<dialog[\s\S]*?<\/dialog>/gi, " ")
    .replace(/<menu[\s\S]*?<\/menu>/gi, " ");
}

function cleanText(value: string | null | undefined) {
  if (!value) return "";

  let text = decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/article>/gi, "\n\n")
    .replace(/<\/section>/gi, "\n\n")
    .replace(/<\/blockquote>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\bwww\.\S+/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  text =
    removeSourceAttributionText(text);

  return uniqueParagraphs(text);
}

/* -------------------------------------------------------------------------- */
/* XML helpers                                                                */
/* -------------------------------------------------------------------------- */

function xmlValue(
  item: string,
  tag: string
) {
  const match = item.match(
    new RegExp(
      `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    )
  );

  if (!match?.[1]) return "";

  return match[1]
    .replace(
      /<!\[CDATA\[([\s\S]*?)\]\]>/g,
      "$1"
    )
    .trim();
}

function xmlAttribute(
  item: string,
  tag: string,
  attribute: string
) {
  const match = item.match(
    new RegExp(
      `<${tag}\\b[^>]*\\b${attribute}=["']([^"']+)["']`,
      "i"
    )
  );

  return match?.[1]?.trim() || null;
}

/* -------------------------------------------------------------------------- */
/* RSS parsing                                                                */
/* -------------------------------------------------------------------------- */

function extractItemLink(rawItem: string) {
  const link =
    xmlValue(rawItem, "link");

  if (
    link &&
    /^https?:\/\//i.test(link)
  ) {
    return link;
  }

  const atomLink =
    rawItem.match(
      /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i
    )?.[1];

  if (
    atomLink &&
    /^https?:\/\//i.test(atomLink)
  ) {
    return atomLink.trim();
  }

  const guid =
    xmlValue(rawItem, "guid");

  if (
    guid &&
    /^https?:\/\//i.test(guid)
  ) {
    return guid;
  }

  return "";
}

function extractImage(item: string) {
  const images = [
    xmlAttribute(
      item,
      "media:content",
      "url"
    ),

    xmlAttribute(
      item,
      "media:thumbnail",
      "url"
    ),

    xmlAttribute(
      item,
      "enclosure",
      "url"
    ),

    item.match(
      /<media:content\b[^>]*\burl=["']([^"']+)["']/i
    )?.[1],

    item.match(
      /<media:thumbnail\b[^>]*\burl=["']([^"']+)["']/i
    )?.[1],

    item.match(
      /<img\b[^>]*\bsrc=["']([^"']+)["']/i
    )?.[1],

    item.match(
      /<img\b[^>]*\bdata-src=["']([^"']+)["']/i
    )?.[1],

    item.match(
      /<img\b[^>]*\bdata-original=["']([^"']+)["']/i
    )?.[1],

    item
      .match(
        /<img\b[^>]*\bsrcset=["']([^"']+)["']/i
      )?.[1]
      ?.split(",")[0]
      ?.trim()
      ?.split(/\s+/)[0],
  ];

  for (const image of images) {
    if (
      image &&
      /^https?:\/\//i.test(
        decodeHtml(image)
      )
    ) {
      return decodeHtml(image).trim();
    }
  }

  return null;
}

function extractSourceCategory(
  rawItem: string
) {
  const values: string[] = [];

  const regex =
    /<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawItem))) {
    const value =
      cleanText(match[1]);

    if (value) {
      values.push(value);
    }
  }

  return values[0] || null;
}

function extractFeedContent(
  rawItem: string
) {
  const candidates = [
    xmlValue(
      rawItem,
      "content:encoded"
    ),
    xmlValue(
      rawItem,
      "content"
    ),
    xmlValue(
      rawItem,
      "description"
    ),
    xmlValue(
      rawItem,
      "summary"
    ),
  ];

  let best = "";

  for (const candidate of candidates) {
    const cleaned =
      cleanText(candidate);

    if (
      wordCount(cleaned) >
      wordCount(best)
    ) {
      best = cleaned;
    }
  }

  return best;
}

async function parseFeed(
  feedUrl: string
) {
  const response =
    await fetch(feedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; JNMuleeNews/1.0)",
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      cache: "no-store",
    });

  if (!response.ok) {
    throw new Error(
      `Feed returned ${response.status}`
    );
  }

  const xml =
    await response.text();

  const items: string[] = [];

  let position = 0;

  while (true) {
    const start =
      xml.indexOf(
        "<item",
        position
      );

    if (start === -1) break;

    const end =
      xml.indexOf(
        "</item>",
        start
      );

    if (end === -1) break;

    items.push(
      xml.slice(
        start,
        end +
          "</item>".length
      )
    );

    position =
      end +
      "</item>".length;
  }

  if (!items.length) {
    position = 0;

    while (true) {
      const start =
        xml.indexOf(
          "<entry",
          position
        );

      if (start === -1) break;

      const end =
        xml.indexOf(
          "</entry>",
          start
        );

      if (end === -1) break;

      items.push(
        xml.slice(
          start,
          end +
            "</entry>".length
        )
      );

      position =
        end +
        "</entry>".length;
    }
  }

  return items;
}

/* -------------------------------------------------------------------------- */
/* Category classifier                                                        */
/* -------------------------------------------------------------------------- */

function classifyCategory(
  title: string,
  content: string,
  sourceCategory?: string | null,
  sourceDefaultCategory?: string | null
) {
  const text =
    `${title} ${content}`.toLowerCase();

  const source =
    (
      sourceCategory ||
      sourceDefaultCategory ||
      ""
    ).trim();

  if (
    ALLOWED_CATEGORIES.includes(
      source
    ) &&
    source !== "News"
  ) {
    return source;
  }

  if (
    /\b(bitcoin|ethereum|crypto|cryptocurrency|blockchain|binance|coinbase|defi|nft|solana|xrp|token)\b/i.test(
      text
    )
  ) {
    return "Crypto";
  }

  if (
    /\b(football|soccer|sport|arsenal|chelsea|liverpool|manchester|barcelona|real madrid|nba|nfl|tennis|boxing|ufc|fifa|premier league|champions league)\b/i.test(
      text
    )
  ) {
    return "Sports";
  }

  if (
    /\b(technology|technology news|tech|artificial intelligence|ai|iphone|android|google|microsoft|apple|meta|software|cybersecurity|startup|robot|robotics|semiconductor|chip)\b/i.test(
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
    /\b(politics|political|president|governor|senate|senator|election|minister|government|campaign|party|apc|pdp|labour party|legislator)\b/i.test(
      text
    )
  ) {
    return "Politics";
  }

  if (
    /\b(entertainment|music|movie|film|actor|actress|celebrity|singer|album|concert|award|hollywood|nollywood)\b/i.test(
      text
    )
  ) {
    return "Entertainment";
  }

  if (
    /\b(gossip|rumour|rumor|relationship|dating|breakup|marriage|love life)\b/i.test(
      text
    )
  ) {
    return "Gossip";
  }

  if (
    /\b(nigeria|nigerian|lagos|abuja|anambra|enugu|imo|delta|rivers|kaduna|kano|oyo|ibadan|onitsha|port harcourt)\b/i.test(
      text
    )
  ) {
    return "Nigeria";
  }

  if (
    /\b(world|international|america|american|united states|uk|britain|british|europe|china|russia|ukraine|israel|palestine|india|canada|australia|france|germany)\b/i.test(
      text
    )
  ) {
    return "World";
  }

  return "Top Stories";
}

/* -------------------------------------------------------------------------- */
/* URL safety                                                                 */
/* -------------------------------------------------------------------------- */

function isSafeExternalUrl(
  value: string
) {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return false;
    }

    const hostname =
      url.hostname
        .toLowerCase()
        .replace(/^\[/, "")
        .replace(/\]$/, "");

    if (
      hostname === "localhost" ||
      hostname === "localhost.localdomain" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "169.254.169.254" ||
      hostname === "metadata.google.internal"
    ) {
      return false;
    }

    if (
      /^10\./.test(hostname) ||
      /^127\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(
        hostname
      )
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* JSON-LD extraction                                                         */
/* -------------------------------------------------------------------------- */

function extractJsonLdArticleBody(
  html: string
) {
  const scripts =
    html.match(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
    ) || [];

  const bodies: string[] = [];

  for (const script of scripts) {
    const raw =
      script
        .replace(
          /<script\b[^>]*>/i,
          ""
        )
        .replace(
          /<\/script>\s*$/i,
          ""
        )
        .trim();

    if (!raw) continue;

    try {
      const parsed =
        JSON.parse(raw);

      const visit = (
        value: unknown
      ) => {
        if (!value) return;

        if (
          Array.isArray(value)
        ) {
          for (const item of value) {
            visit(item);
          }

          return;
        }

        if (
          typeof value !== "object"
        ) {
          return;
        }

        const obj =
          value as Record<
            string,
            unknown
          >;

        if (
          typeof obj.articleBody ===
          "string"
        ) {
          bodies.push(
            obj.articleBody
          );
        }

        if (obj["@graph"]) {
          visit(obj["@graph"]);
        }

        if (obj.mainEntity) {
          visit(obj.mainEntity);
        }

        if (
          obj.mainEntityOfPage
        ) {
          visit(
            obj.mainEntityOfPage
          );
        }
      };

      visit(parsed);
    } catch {
      continue;
    }
  }

  return uniqueParagraphs(
    bodies
      .map(cleanText)
      .filter(Boolean)
      .join("\n\n")
  );
}

/* -------------------------------------------------------------------------- */
/* Candidate article containers                                               */
/* -------------------------------------------------------------------------- */

function extractCandidateBlocks(
  html: string
) {
  const candidates: string[] = [];

  const patterns = [
    /<article\b[^>]*>([\s\S]*?)<\/article>/gi,

    /<main\b[^>]*>([\s\S]*?)<\/main>/gi,

    /<div\b[^>]*(?:id|class)=["'][^"']*(?:article-body|article__body|article-content|article__content|entry-content|post-content|post__content|story-body|story__body|story-content|news-content|content-body|single-content|single-post-content|td-post-content|field-name-body|body-content|articleText|article-text)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;

    while (
      (match = pattern.exec(html))
    ) {
      if (match[1]) {
        candidates.push(
          match[1]
        );
      }
    }
  }

  return candidates;
}

/* -------------------------------------------------------------------------- */
/* Score article candidates                                                   */
/* -------------------------------------------------------------------------- */

function scoreArticleText(
  text: string,
  title: string
) {
  const words =
    wordCount(text);

  if (words < 50) {
    return -999999;
  }

  let score =
    words * 1.5;

  const paragraphs =
    text.split(
      /\n\s*\n/
    ).length;

  score +=
    paragraphs * 12;

  const lower =
    text.toLowerCase();

  const titleWords =
    title
      .toLowerCase()
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 3
      );

  for (const word of titleWords) {
    if (
      lower.includes(
        word.replace(
          /[^a-z0-9]/g,
          ""
        )
      )
    ) {
      score += 5;
    }
  }

  const badSignals = [
    "sign up",
    "subscribe",
    "newsletter",
    "related stories",
    "related articles",
    "most read",
    "latest news",
    "follow us",
    "advertisement",
    "advertising",
    "cookie policy",
    "privacy policy",
    "terms of use",
    "all rights reserved",
    "share this",
    "read next",
    "you may also like",
  ];

  for (const signal of badSignals) {
    if (
      lower.includes(signal)
    ) {
      score -= 50;
    }
  }

  return score;
}

function chooseBestArticleCandidate(
  candidates: string[],
  title: string
) {
  let best = "";

  let bestScore =
    -Infinity;

  for (const candidate of candidates) {
    const cleaned =
      cleanText(
        removeUnwantedHtml(
          candidate
        )
      );

    const words =
      wordCount(cleaned);

    if (
      words <
      MIN_PAGE_WORDS
    ) {
      continue;
    }

    const score =
      scoreArticleText(
        cleaned,
        title
      );

    if (
      score >
      bestScore
    ) {
      bestScore =
        score;

      best =
        cleaned;
    }
  }

  return best;
}

/* -------------------------------------------------------------------------- */
/* Fetch original article page                                                */
/* -------------------------------------------------------------------------- */

async function fetchArticlePage(
  articleUrl: string,
  title: string
) {
  if (
    !articleUrl ||
    !isSafeExternalUrl(articleUrl)
  ) {
    return {
      content: "",
      success: false,
      reason: "invalid_url",
    };
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      ARTICLE_PAGE_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        articleUrl,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; JNMuleeNews/1.0)",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language":
              "en-US,en;q=0.9",
          },

          /*
           * Let fetch follow normal HTTP redirects.
           */
          redirect: "follow",

          cache: "no-store",

          signal:
            controller.signal,
        }
      );

    if (!response.ok) {
      return {
        content: "",
        success: false,
        reason:
          `http_${response.status}`,
      };
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      !contentType
        .toLowerCase()
        .includes("text/html")
    ) {
      return {
        content: "",
        success: false,
        reason: "not_html",
      };
    }

    const html =
      await response.text();

    if (!html) {
      return {
        content: "",
        success: false,
        reason: "empty_html",
      };
    }

    /*
     * 1. JSON-LD articleBody
     */
    const jsonLd =
      extractJsonLdArticleBody(
        html
      );

    /*
     * 2. Article/main/common content
     */
    const candidates =
      extractCandidateBlocks(
        html
      );

    const bestContainer =
      chooseBestArticleCandidate(
        candidates,
        title
      );

    /*
     * 3. Compare JSON-LD against
     * container extraction.
     */
    let best =
      jsonLd;

    if (
      scoreArticleText(
        bestContainer,
        title
      ) >
      scoreArticleText(
        jsonLd,
        title
      )
    ) {
      best =
        bestContainer;
    }

    /*
     * 4. If specialized extraction
     * is weak, inspect the body.
     */
    if (
      wordCount(best) <
      MIN_PAGE_WORDS
    ) {
      const body =
        html.match(
          /<body\b[^>]*>([\s\S]*?)<\/body>/i
        )?.[1] || "";

      const bodyText =
        cleanText(
          removeUnwantedHtml(
            body
          )
        );

      if (
        scoreArticleText(
          bodyText,
          title
        ) >
        scoreArticleText(
          best,
          title
        )
      ) {
        best =
          bodyText;
      }
    }

    best =
      removeSourceAttributionText(
        best
      );

    best =
      uniqueParagraphs(
        best
      );

    if (
      best.length >
      MAX_ARTICLE_PAGE_CHARS
    ) {
      best =
        best.slice(
          0,
          MAX_ARTICLE_PAGE_CHARS
        );
    }

    if (
      wordCount(best) <
      MIN_PAGE_WORDS
    ) {
      return {
        content: "",
        success: false,
        reason:
          "not_enough_article_text",
      };
    }

    return {
      content: best,
      success: true,
      reason: "success",
    };
  } catch (error) {
    return {
      content: "",
      success: false,
      reason:
        error instanceof Error
          ? error.message
          : "fetch_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/* -------------------------------------------------------------------------- */
/* Combine RSS + article page                                                 */
/* -------------------------------------------------------------------------- */

function buildSourceMaterial({
  title,
  rssContent,
  articlePageContent,
}: {
  title: string;
  rssContent: string;
  articlePageContent: string;
}) {
  const parts: string[] = [];

  if (title.trim()) {
    parts.push(
      `FEED HEADLINE:\n${title.trim()}`
    );
  }

  if (
    articlePageContent.trim()
  ) {
    parts.push(
      `FULL ARTICLE PAGE CONTENT:\n${articlePageContent.trim()}`
    );
  }

  if (rssContent.trim()) {
    parts.push(
      `RSS FEED CONTENT:\n${rssContent.trim()}`
    );
  }

  let combined =
    parts.join(
      "\n\n==============================\n\n"
    );

  if (
    combined.length >
    MAX_COMBINED_SOURCE_CHARS
  ) {
    combined =
      combined.slice(
        0,
        MAX_COMBINED_SOURCE_CHARS
      );
  }

  return combined;
}

/* -------------------------------------------------------------------------- */
/* Article HTML sanitization                                                  */
/* -------------------------------------------------------------------------- */

function removeSourceAttributionHtml(
  html: string
) {
  let result = html;

  result = result.replace(
    /<p>\s*(?:source|sources|original source|article source|story source|news source|via|courtesy of|credit|image credit|photo credit)\s*:?\s*[\s\S]*?<\/p>/gi,
    ""
  );

  result = result.replace(
    /<p>\s*(?:read more|continue reading|read the full story|read full story|originally published by|originally published on)[\s\S]*?<\/p>/gi,
    ""
  );

  result = result.replace(
    /https?:\/\/[^\s<>"')]+/gi,
    ""
  );

  result = result.replace(
    /\bwww\.[^\s<>"')]+/gi,
    ""
  );

  result = result.replace(
    /\b(?:Source|Sources|Original Source|Article Source|Story Source|News Source)\s*:\s*[^<\n]+/gi,
    ""
  );

  result = result.replace(
    /\b(?:Originally published by|Originally published on)\s+[^<\n]+/gi,
    ""
  );

  result = result.replace(
    /<p>\s*<\/p>/gi,
    ""
  );

  return result.trim();
}

function sanitizeArticleHtml(
  value: string
) {
  let html =
    value
      .replace(
        /```html/gi,
        ""
      )
      .replace(
        /```json/gi,
        ""
      )
      .replace(
        /```/g,
        ""
      )
      .trim();

  html =
    html
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        ""
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        ""
      )
      .replace(
        /<iframe[\s\S]*?<\/iframe>/gi,
        ""
      )
      .replace(
        /<object[\s\S]*?<\/object>/gi,
        ""
      )
      .replace(
        /<embed[\s\S]*?>/gi,
        ""
      );

  html =
    html.replace(
      /<a\b[^>]*>([\s\S]*?)<\/a>/gi,
      "$1"
    );

  /*
   * Keep only article-safe tags.
   */
  html =
    html.replace(
      /<(?!\/?(?:p|h2|h3|strong|em|ul|ol|li|blockquote|br)\b)[^>]*>/gi,
      ""
    );

  html =
    removeSourceAttributionHtml(
      html
    );

  return html.trim();
}

/* -------------------------------------------------------------------------- */
/* Convert plain text to HTML                                                 */
/* -------------------------------------------------------------------------- */

function textToHtml(
  value: string
) {
  const cleaned =
    removeSourceAttributionText(
      value
    );

  const paragraphs =
    cleaned
      .split(/\n\s*\n/)
      .map(
        (part) =>
          part.trim()
      )
      .filter(Boolean);

  return paragraphs
    .map(
      (paragraph) =>
        `<p>${escapeHtml(
          paragraph
        ).replace(
          /\n/g,
          "<br />"
        )}</p>`
    )
    .join("\n");
}

/* -------------------------------------------------------------------------- */
/* Make article readable                                                      */
/* -------------------------------------------------------------------------- */

function formatReadableArticleHtml(
  html: string
) {
  html =
    sanitizeArticleHtml(
      html
    );

  html =
    removeSourceAttributionHtml(
      html
    );

  return html.trim();
}

/* -------------------------------------------------------------------------- */
/* OpenAI reconstruction                                                       */
/* -------------------------------------------------------------------------- */

async function createLongOriginalArticle({
  title,
  content,
  category,
}: {
  title: string;
  content: string;
  category: string;
}) {
  if (!openai) {
    return null;
  }

  if (
    wordCount(content) <
    MIN_SOURCE_WORDS_FOR_AI
  ) {
    /*
     * Do not ask AI to manufacture a
     * full article from a tiny excerpt.
     */
    return null;
  }

  try {
    const response =
      await openai.chat.completions.create({
        model: OPENAI_MODEL,

        temperature: 0.2,

        max_tokens: 4000,

        response_format: {
          type: "json_schema",

          json_schema: {
            name: "jnmulee_article",

            strict: true,

            schema: {
              type: "object",

              properties: {
                headline: {
                  type: "string",
                },

                article_html: {
                  type: "string",
                },
              },

              required: [
                "headline",
                "article_html",
              ],

              additionalProperties:
                false,
            },
          },
        },

        messages: [
          {
            role: "system",

            content: `
You are the senior digital news editor for JNMulee News.

Reconstruct a complete, accurate, professionally written news article from the supplied factual source material.

The supplied material can contain:
- RSS headline
- RSS description
- Full article webpage text
- JSON-LD article text
- Repeated excerpts
- Website navigation
- Promotional material
- Attribution
- "Read more" text
- Newsletter text
- Social media text

Use the factual article information, not website navigation or promotional material.

IMPORTANT:

Do NOT invent facts.

Do NOT invent names.

Do NOT invent dates.

Do NOT invent locations.

Do NOT invent statistics.

Do NOT invent quotes.

Do NOT invent events.

Do NOT invent motives.

Do NOT create statements that are not supported by the source material.

Preserve factual names, numbers, dates and quotations accurately.

If a quotation exists in the source, do not manufacture a new quotation.

If the source does not provide enough information for a particular detail, leave that detail out.

ARTICLE LENGTH:

Aim for approximately 1,000 to 1,300 words when enough factual material exists.

Use as much of the supplied factual material as possible.

Do not shorten the article merely because the RSS description is short if the FULL ARTICLE PAGE CONTENT contains more information.

Do not repeat facts just to reach the target word count.

If the factual source genuinely contains less information, write a shorter complete article rather than inventing material.

WRITING STYLE:

Write as a professional digital news article.

Use:
- strong opening paragraph
- clear paragraphs
- useful H2 subheadings
- logical progression
- important facts early
- relevant details later
- clear ending

Use short mobile-friendly paragraphs.

Do not write clickbait.

Do not sensationalize.

Do not add unsupported opinions.

SOURCE ATTRIBUTION:

The original website's name or URL must NOT appear as promotional attribution in the finished article.

Do not write:
"Source:"
"Sources:"
"Original source:"
"Article source:"
"Originally published by..."
"Originally published on..."
"Read more..."
"Continue reading..."
"Via..."
"Courtesy of..."
"Visit..."
"Follow us..."
or any website URL.

Do not tell the reader where the supplied material came from.

However, keep factual names of companies, governments, organizations, people, teams, products and places when they are part of the actual news.

HTML:

Return valid JSON only.

Use:

{
  "headline": "Accurate headline",
  "article_html": "<p>Opening paragraph...</p><h2>Subheading</h2><p>...</p>"
}

Allowed HTML:
<p>
<h2>
<h3>
<strong>
<em>
<ul>
<ol>
<li>
<blockquote>
<br>

Do not use Markdown.

Do not use code fences.

Do not use links.

Do not use scripts.

Do not use styles.

Do not use images.

Do not use tables.
            `.trim(),
          },

          {
            role: "user",

            content: `
CATEGORY:
${category}

FEED HEADLINE:
${title}

FACTUAL SOURCE MATERIAL:
${content}
            `.trim(),
          },
        ],
      });

    const message =
      response.choices[0]?.message;

    if (
      message?.refusal
    ) {
      console.error(
        "OpenAI refused article generation."
      );

      return null;
    }

    const text =
      message?.content?.trim();

    if (!text) {
      return null;
    }

    let parsed: {
      headline?: string;
      article_html?: string;
    };

    try {
      parsed =
        JSON.parse(text);
    } catch (error) {
      console.error(
        "OpenAI JSON parsing failed:",
        error
      );

      return null;
    }

    const headline =
      cleanText(
        parsed.headline
      );

    let articleHtml =
      parsed.article_html ||
      "";

    if (
      !headline ||
      !articleHtml
    ) {
      return null;
    }

    articleHtml =
      formatReadableArticleHtml(
        articleHtml
      );

    const articleText =
      cleanText(
        articleHtml
      );

    const words =
      wordCount(articleText);

    if (
      words <
      MIN_FINAL_WORDS
    ) {
      console.error(
        `Generated article too short: ${words} words`
      );

      return null;
    }

    return {
      headline,
      articleHtml,
      wordCount: words,
    };
  } catch (error) {
    console.error(
      "OpenAI article generation failed:",
      error
    );

    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Main API route                                                             */
/* -------------------------------------------------------------------------- */

export async function GET() {
  let processed = 0;
  let generated = 0;
  let published = 0;
  let skipped = 0;
  let skippedNoImage = 0;
  let skippedInsufficientContent = 0;
  let aiGenerated = 0;
  let articlePagesFetched = 0;
  let articlePagesFailed = 0;

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
        const items =
          await parseFeed(
            source.feed_url
          );

        for (const rawItem of items.slice(
          0,
          MAX_FEED_ITEMS_PER_SOURCE
        )) {
          processed++;

          const title =
            cleanText(
              xmlValue(
                rawItem,
                "title"
              )
            );

          const link =
            extractItemLink(
              rawItem
            );

          if (
            !title ||
            !link
          ) {
            skipped++;
            continue;
          }

          /*
           * Image is required by your
           * current publishing setup.
           */
          const imageUrl =
            extractImage(
              rawItem
            );

          if (
            !imageUrl ||
            !/^https?:\/\//i.test(
              imageUrl
            )
          ) {
            skippedNoImage++;
            continue;
          }

          /*
           * Duplicate check happens BEFORE
           * the expensive webpage/OpenAI work.
           */
          const {
            data: duplicate,
            error:
              duplicateError,
          } = await supabase
            .from("news")
            .select("id")
            .eq(
              "source_url",
              link
            )
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

          /* -------------------------------------------------------------- */
          /* RSS content                                                      */
          /* -------------------------------------------------------------- */

          const rssContent =
            extractFeedContent(
              rawItem
            );

          const sourceCategory =
            extractSourceCategory(
              rawItem
            );

          /* -------------------------------------------------------------- */
          /* Full webpage extraction                                         */
          /* -------------------------------------------------------------- */

          const page =
            await fetchArticlePage(
              link,
              title
            );

          if (
            page.success &&
            page.content
          ) {
            articlePagesFetched++;
          } else {
            articlePagesFailed++;
          }

          /* -------------------------------------------------------------- */
          /* Determine whether enough source material exists                 */
          /* -------------------------------------------------------------- */

          const pageWords =
            wordCount(
              page.content
            );

          const rssWords =
            wordCount(
              rssContent
            );

          /*
           * If we have a real article page,
           * prioritize it.
           *
           * If we only have a short RSS
           * excerpt, do NOT publish it as
           * a fake "full article".
           */
          const sourceWordCount =
            Math.max(
              pageWords,
              rssWords
            );

          if (
            sourceWordCount <
            MIN_SOURCE_WORDS_FOR_AI
          ) {
            skippedInsufficientContent++;
            skipped++;

            errors.push(
              `${title}: insufficient source content (${sourceWordCount} words)`
            );

            continue;
          }

          /* -------------------------------------------------------------- */
          /* Category                                                         */
          /* -------------------------------------------------------------- */

          const category =
            classifyCategory(
              title,
              `${rssContent} ${page.content}`,
              sourceCategory,
              source.category
            );

          /* -------------------------------------------------------------- */
          /* Build source material                                            */
          /* -------------------------------------------------------------- */

          const sourceMaterial =
            buildSourceMaterial({
              title,
              rssContent,
              articlePageContent:
                page.content,
            });

          /* -------------------------------------------------------------- */
          /* OpenAI reconstruction                                            */
          /* -------------------------------------------------------------- */

          const generatedArticle =
            await createLongOriginalArticle({
              title,
              content:
                sourceMaterial,
              category,
            });

          if (
            !generatedArticle
          ) {
            /*
             * IMPORTANT:
             *
             * We no longer publish the
             * short RSS description if
             * OpenAI fails.
             *
             * If a complete article page
             * was successfully extracted,
             * we can publish that cleaned
             * page content as a fallback.
             *
             * Otherwise skip the item.
             */
            if (
              page.success &&
              pageWords >=
                MIN_FINAL_WORDS
            ) {
              const fallbackHtml =
                textToHtml(
                  page.content
                );

              const fallbackText =
                cleanText(
                  fallbackHtml
                );

              if (
                wordCount(
                  fallbackText
                ) >= MIN_FINAL_WORDS
              ) {
                const {
                  error:
                    fallbackInsertError,
                } = await supabase
                  .from("news")
                  .insert({
                    title,

                    slug:
                      makeSlug(
                        title
                      ),

                    content:
                      fallbackHtml,

                    image_url:
                      imageUrl,

                    Published:
                      true,

                    source_url:
                      link,

                    category,
                  });

                if (
                  fallbackInsertError
                ) {
                  if (
                    fallbackInsertError.code ===
                    "23505"
                  ) {
                    skipped++;
                    continue;
                  }

                  errors.push(
                    `${title}: ${fallbackInsertError.message}`
                  );

                  continue;
                }

                generated++;
                published++;
                continue;
              }
            }

            skippedInsufficientContent++;
            skipped++;

            errors.push(
              `${title}: OpenAI reconstruction failed and no safe full-article fallback was available`
            );

            continue;
          }

          aiGenerated++;

          let finalTitle =
            cleanText(
              generatedArticle.headline
            ) || title;

          let finalContent =
            formatReadableArticleHtml(
              generatedArticle.articleHtml
            );

          /*
           * Last cleanup before database
           * insertion.
           */
          finalContent =
            removeSourceAttributionHtml(
              finalContent
            );

          finalContent =
            formatReadableArticleHtml(
              finalContent
            );

          const finalWords =
            wordCount(
              cleanText(
                finalContent
              )
            );

          /*
           * Never publish a very short
           * generated article.
           */
          if (
            finalWords <
            MIN_FINAL_WORDS
          ) {
            skippedInsufficientContent++;
            skipped++;

            errors.push(
              `${finalTitle}: generated article was only ${finalWords} words`
            );

            continue;
          }

          /* -------------------------------------------------------------- */
          /* Save                                                             */
          /* -------------------------------------------------------------- */

          const {
            error: insertError,
          } = await supabase
            .from("news")
            .insert({
              title:
                finalTitle,

              slug:
                makeSlug(
                  finalTitle
                ),

              content:
                finalContent,

              image_url:
                imageUrl,

              Published:
                true,

              /*
               * This remains internal
               * database metadata.
               *
               * It is NOT placed in
               * article content.
               */
              source_url:
                link,

              category,
            });

          if (insertError) {
            if (
              insertError.code ===
              "23505"
            ) {
              skipped++;
              continue;
            }

            errors.push(
              `${finalTitle}: ${insertError.message}`
            );

            continue;
          }

          generated++;
          published++;
        }
      } catch (error) {
        errors.push(
          `${source.name || source.feed_url}: ${
            error instanceof Error
              ? error.message
              : "Feed processing failed"
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

      skippedInsufficientContent,

      aiGenerated,

      articlePagesFetched,

      articlePagesFailed,

      errors,

      message:
        "JNMulee News importer completed using RSS + full webpage extraction + OpenAI reconstruction.",
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

        skippedInsufficientContent,

        aiGenerated,

        articlePagesFetched,

        articlePagesFailed,

        errors: [
          error instanceof Error
            ? error.message
            : "Unknown importer error",
        ],
      },
      {
        status: 500,
      }
    );
  }
}