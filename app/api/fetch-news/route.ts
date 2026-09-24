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

const MAX_FEED_ITEMS_PER_SOURCE = 20;
const ARTICLE_PAGE_TIMEOUT_MS = 12000;
const MAX_ARTICLE_PAGE_CHARS = 50000;
const MAX_COMBINED_SOURCE_CHARS = 70000;

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

/* -------------------------------------------------------------------------- */
/* Remove source / attribution text                                           */
/* -------------------------------------------------------------------------- */

function removeSourceAttributionText(value: string) {
  if (!value) {
    return "";
  }

  let text = value;

  /*
   * Remove common standalone attribution lines.
   */
  text = text.replace(
    /^\s*(source|sources)\s*:\s*.*$/gim,
    ""
  );

  text = text.replace(
    /^\s*(original source|originally published by|originally published on)\s*:\s*.*$/gim,
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
    /^\s*(article source|story source|news source)\s*:\s*.*$/gim,
    ""
  );

  /*
   * Remove common website attribution sentences.
   */
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

  /*
   * Remove URLs.
   */
  text = text.replace(
    /https?:\/\/[^\s<>"')]+/gi,
    ""
  );

  text = text.replace(
    /\bwww\.[^\s<>"')]+/gi,
    ""
  );

  /*
   * Remove common feed/footer attribution fragments.
   */
  text = text.replace(
    /\b(subscribe to|follow us on|follow us|visit our website|visit us at|more from)\s+[^.!?\n]+[.!?]?/gi,
    ""
  );

  return normalizeWhitespace(text);
}

/* -------------------------------------------------------------------------- */
/* Clean text                                                                 */
/* -------------------------------------------------------------------------- */

function cleanText(
  value: string | null | undefined
) {
  if (!value) {
    return "";
  }

  let text = decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(
      /<a\b[^>]*>([\s\S]*?)<\/a>/gi,
      "$1"
    )
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

  text = removeSourceAttributionText(text);

  return text;
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wordCount(text: string) {
  return cleanText(text)
    .split(/\s+/)
    .filter(Boolean).length;
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  if (!match?.[1]) {
    return "";
  }

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
/* Article link                                                                */
/* -------------------------------------------------------------------------- */

function extractItemLink(rawItem: string) {
  const normalLink =
    xmlValue(rawItem, "link");

  if (
    normalLink &&
    /^https?:\/\//i.test(normalLink)
  ) {
    return normalLink;
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

/* -------------------------------------------------------------------------- */
/* Image extraction                                                           */
/* -------------------------------------------------------------------------- */

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
      /<image\b[^>]*>\s*<url[^>]*>([\s\S]*?)<\/url>/i
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

    item.match(
      /<img\b[^>]*\bsrcset=["']([^"']+)["']/i
    )?.[1]
      ?.split(",")[0]
      ?.trim()
      ?.split(" ")[0],
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

/* -------------------------------------------------------------------------- */
/* Category                                                                   */
/* -------------------------------------------------------------------------- */

function extractSourceCategory(
  rawItem: string
) {
  const categories: string[] = [];

  const regex =
    /<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawItem))) {
    const value = cleanText(match[1]);

    if (value) {
      categories.push(value);
    }
  }

  return categories[0] || null;
}

function classifyCategory(
  title: string,
  description: string,
  sourceCategory: string | null | undefined
) {
  const text =
    `${title} ${description}`.toLowerCase();

  const source =
    (sourceCategory || "").trim();

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

  if (
    specificCategories.includes(source)
  ) {
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

  if (
    ALLOWED_CATEGORIES.includes(source)
  ) {
    return source;
  }

  return "Top Stories";
}

/* -------------------------------------------------------------------------- */
/* RSS / Atom parser                                                          */
/* -------------------------------------------------------------------------- */

async function parseFeed(
  feedUrl: string
) {
  const response = await fetch(feedUrl, {
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

    items.push(
      xml.slice(
        itemStart,
        itemEnd +
          "</item>".length
      )
    );

    start =
      itemEnd +
      "</item>".length;
  }

  if (items.length === 0) {
    let entryStart = 0;

    while (true) {
      const startIndex = xml.indexOf(
        "<entry",
        entryStart
      );

      if (startIndex === -1) {
        break;
      }

      const endIndex = xml.indexOf(
        "</entry>",
        startIndex
      );

      if (endIndex === -1) {
        break;
      }

      items.push(
        xml.slice(
          startIndex,
          endIndex +
            "</entry>".length
        )
      );

      entryStart =
        endIndex +
        "</entry>".length;
    }
  }

  return items;
}

/* -------------------------------------------------------------------------- */
/* Feed content                                                                */
/* -------------------------------------------------------------------------- */

function extractFeedContent(
  rawItem: string
) {
  const possibleContent = [
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

  for (const value of possibleContent) {
    const cleaned =
      cleanText(value);

    if (cleaned) {
      return cleaned;
    }
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* URL safety                                                                  */
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
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(
        hostname
      ) ||
      /^127\./.test(hostname)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Remove unwanted HTML                                                       */
/* -------------------------------------------------------------------------- */

function removeUnwantedHtml(
  html: string
) {
  return html
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<noscript[\s\S]*?<\/noscript>/gi,
      " "
    )
    .replace(
      /<iframe[\s\S]*?<\/iframe>/gi,
      " "
    )
    .replace(
      /<svg[\s\S]*?<\/svg>/gi,
      " "
    )
    .replace(
      /<nav[\s\S]*?<\/nav>/gi,
      " "
    )
    .replace(
      /<header[\s\S]*?<\/header>/gi,
      " "
    )
    .replace(
      /<footer[\s\S]*?<\/footer>/gi,
      " "
    )
    .replace(
      /<aside[\s\S]*?<\/aside>/gi,
      " "
    )
    .replace(
      /<form[\s\S]*?<\/form>/gi,
      " "
    )
    .replace(
      /<dialog[\s\S]*?<\/dialog>/gi,
      " "
    );
}

/* -------------------------------------------------------------------------- */
/* JSON-LD article body                                                        */
/* -------------------------------------------------------------------------- */

function extractJsonLdArticleBody(
  html: string
) {
  const scripts =
    html.match(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
    ) || [];

  const results: string[] = [];

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

    if (!raw) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(raw);

      const visit = (
        value: unknown
      ) => {
        if (!value) {
          return;
        }

        if (
          Array.isArray(value)
        ) {
          for (const item of value) {
            visit(item);
          }

          return;
        }

        if (
          typeof value !==
          "object"
        ) {
          return;
        }

        const object =
          value as Record<
            string,
            unknown
          >;

        if (
          typeof object.articleBody ===
          "string"
        ) {
          results.push(
            object.articleBody
          );
        }

        if (
          object["@graph"]
        ) {
          visit(
            object["@graph"]
          );
        }

        if (
          object.mainEntity
        ) {
          visit(
            object.mainEntity
          );
        }

        if (
          object.mainEntityOfPage
        ) {
          visit(
            object.mainEntityOfPage
          );
        }
      };

      visit(parsed);
    } catch {
      continue;
    }
  }

  return normalizeWhitespace(
    results
      .map(cleanText)
      .filter(Boolean)
      .join("\n\n")
  );
}

/* -------------------------------------------------------------------------- */
/* Article container extraction                                                */
/* -------------------------------------------------------------------------- */

function extractArticleContainer(
  html: string
) {
  const selectors = [
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,

    /<main\b[^>]*>([\s\S]*?)<\/main>/i,

    /<div\b[^>]*(?:class|id)=["'][^"']*(?:article-body|article__body|article-content|article__content|entry-content|post-content|post__content|story-body|story__body|story-content|news-content|content-body|single-content|single-post-content|td-post-content|field-name-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of selectors) {
    const match =
      html.match(pattern);

    if (match?.[1]) {
      const text =
        cleanText(
          removeUnwantedHtml(
            match[1]
          )
        );

      if (
        wordCount(text) >= 80
      ) {
        return text;
      }
    }
  }

  const body =
    html.match(
      /<body\b[^>]*>([\s\S]*?)<\/body>/i
    )?.[1];

  if (body) {
    const text =
      cleanText(
        removeUnwantedHtml(body)
      );

    if (wordCount(text) >= 80) {
      return text;
    }
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* Fetch article page                                                          */
/* -------------------------------------------------------------------------- */

async function fetchArticlePage(
  articleUrl: string
) {
  if (
    !articleUrl ||
    !isSafeExternalUrl(articleUrl)
  ) {
    return {
      content: "",
      fetched: false,
      reason: "unsafe_or_invalid_url",
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
          method: "GET",

          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; JNMuleeNews/1.0; +https://jnmulee.com)",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language":
              "en-US,en;q=0.9",
          },

          redirect: "manual",

          cache: "no-store",

          signal:
            controller.signal,
        }
      );

    if (
      response.status >= 300 &&
      response.status < 400
    ) {
      return {
        content: "",
        fetched: false,
        reason: "redirect_not_followed",
      };
    }

    if (!response.ok) {
      return {
        content: "",
        fetched: false,
        reason: `article_page_http_${response.status}`,
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
        fetched: false,
        reason: "not_html",
      };
    }

    const html =
      await response.text();

    if (!html) {
      return {
        content: "",
        fetched: false,
        reason: "empty_page",
      };
    }

    const jsonLdContent =
      extractJsonLdArticleBody(
        html
      );

    let articleContent =
      jsonLdContent;

    if (
      wordCount(articleContent) <
      80
    ) {
      articleContent =
        extractArticleContainer(
          html
        );
    }

    /*
     * Extra cleanup after extracting
     * the article page.
     */
    articleContent =
      removeSourceAttributionText(
        articleContent
      );

    articleContent =
      normalizeWhitespace(
        articleContent
      );

    if (
      !articleContent
    ) {
      return {
        content: "",
        fetched: false,
        reason: "article_text_not_found",
      };
    }

    if (
      articleContent.length >
      MAX_ARTICLE_PAGE_CHARS
    ) {
      articleContent =
        articleContent.slice(
          0,
          MAX_ARTICLE_PAGE_CHARS
        );
    }

    return {
      content:
        articleContent,
      fetched: true,
      reason: "success",
    };
  } catch (error) {
    return {
      content: "",
      fetched: false,
      reason:
        error instanceof Error
          ? error.message
          : "article_page_fetch_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/* -------------------------------------------------------------------------- */
/* Combine source material                                                     */
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
  const sections: string[] = [];

  if (title.trim()) {
    sections.push(
      `HEADLINE FROM FEED:\n${title.trim()}`
    );
  }

  if (rssContent.trim()) {
    sections.push(
      `RSS / FEED CONTENT:\n${rssContent.trim()}`
    );
  }

  if (
    articlePageContent.trim()
  ) {
    sections.push(
      `LINKED ARTICLE PAGE CONTENT:\n${articlePageContent.trim()}`
    );
  }

  let combined =
    sections.join(
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
/* Article HTML sanitizing                                                     */
/* -------------------------------------------------------------------------- */

function sanitizeArticleHtml(
  value: string
) {
  let html = value
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

  html = html
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

  /*
   * Remove all links completely.
   */
  html = html.replace(
    /<a\b[^>]*>([\s\S]*?)<\/a>/gi,
    "$1"
  );

  /*
   * Keep only the HTML tags used by
   * the article renderer.
   */
  html = html.replace(
    /<(?!\/?(?:p|h2|h3|strong|em|ul|ol|li|blockquote|br)\b)[^>]*>/gi,
    ""
  );

  html = html.replace(
    /<\s*(p|h2|h3|strong|em|ul|ol|li|blockquote|br)\b[^>]*>/gi,
    "<$1>"
  );

  html = html.replace(
    /<(\/(?:p|h2|h3|strong|em|ul|ol|li|blockquote|br))\s*>/gi,
    "<$1>"
  );

  /*
   * Clean visible source-attribution text
   * that may have survived inside HTML.
   */
  html = removeSourceAttributionHtml(
    html
  );

  return html.trim();
}

/* -------------------------------------------------------------------------- */
/* Remove attribution from generated HTML                                     */
/* -------------------------------------------------------------------------- */

function removeSourceAttributionHtml(
  html: string
) {
  let result = html;

  /*
   * Remove complete paragraphs that are
   * obviously attribution/navigation.
   */
  result = result.replace(
    /<p>\s*(?:source|sources|original source|article source|story source|news source|via|courtesy of|credit|image credit|photo credit)\s*:?\s*[\s\S]*?<\/p>/gi,
    ""
  );

  result = result.replace(
    /<p>\s*(?:read more|continue reading|read the full story|read full story|originally published by|originally published on)[\s\S]*?<\/p>/gi,
    ""
  );

  /*
   * Remove standalone attribution lines.
   */
  result = result.replace(
    /\b(?:Source|Sources|Original Source|Article Source|Story Source|News Source)\s*:\s*[^<\n]+/gi,
    ""
  );

  result = result.replace(
    /\b(?:Originally published by|Originally published on)\s+[^<\n]+/gi,
    ""
  );

  result = result.replace(
    /\b(?:Read more|Continue reading|Read the full story|Read full story)\s*(?:at|on)?\s*[^<\n]*/gi,
    ""
  );

  /*
   * Remove URLs that might have survived.
   */
  result = result.replace(
    /https?:\/\/[^\s<>"')]+/gi,
    ""
  );

  result = result.replace(
    /\bwww\.[^\s<>"')]+/gi,
    ""
  );

  /*
   * Remove empty paragraphs.
   */
  result = result.replace(
    /<p>\s*<\/p>/gi,
    ""
  );

  return result.trim();
}

/* -------------------------------------------------------------------------- */
/* Readable paragraph formatting                                               */
/* -------------------------------------------------------------------------- */

function formatReadableArticleHtml(
  value: string
) {
  let html =
    sanitizeArticleHtml(value);

  if (!html) {
    return "";
  }

  html = html.replace(
    /<p>([\s\S]*?)<\/p>/gi,
    (_, paragraph: string) => {
      const text =
        removeSourceAttributionText(
          cleanText(paragraph)
        );

      if (!text) {
        return "";
      }

      const sentences =
        text
          .match(
            /[^.!?]+(?:[.!?]+|$)/g
          )
          ?.map(
            (sentence) =>
              sentence.trim()
          )
          .filter(Boolean) || [
          text,
        ];

      const chunks: string[] = [];

      let current: string[] = [];
      let currentLength = 0;

      for (const sentence of sentences) {
        const sentenceLength =
          sentence.length;

        if (
          current.length >= 3 ||
          (current.length >= 2 &&
            currentLength +
              sentenceLength >
              420)
        ) {
          chunks.push(
            current.join(" ")
          );

          current = [];
          currentLength = 0;
        }

        current.push(sentence);

        currentLength +=
          sentenceLength + 1;
      }

      if (current.length) {
        chunks.push(
          current.join(" ")
        );
      }

      return chunks
        .map(
          (chunk) =>
            `<p>${escapeHtml(
              chunk
            )}</p>`
        )
        .join("\n");
    }
  );

  html = html.replace(
    /<p>\s*<\/p>/gi,
    ""
  );

  return html.trim();
}

function textToHtml(
  value: string
) {
  const cleaned =
    removeSourceAttributionText(
      value
    );

  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map(
      (part) =>
        part.trim()
    )
    .filter(Boolean);

  if (!paragraphs.length) {
    return `<p>${escapeHtml(
      cleaned
    )}</p>`;
  }

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

  if (!content.trim()) {
    return null;
  }

  try {
    const response =
      await openai.chat.completions.create({
        model: OPENAI_MODEL,

        temperature: 0.25,

        max_tokens: 3000,

        messages: [
          {
            role: "system",
            content: `
You are the senior digital news editor for JNMulee News.

Your task is to reconstruct a complete, original and professionally written news article from the supplied factual source material.

The source material may contain:
1. An RSS headline.
2. A short RSS description.
3. Content from the linked original article page.

IMPORTANT SOURCE-CLEANING RULE:
The source material may contain the name of the original website, source labels, attribution lines, promotional text, links, "Read more" text, "Continue reading" text, newsletter promotions, social-media promotions, or instructions to visit another website.

DO NOT copy those source-attribution or promotional elements into the final article.

Do not mention the original publishing website merely as attribution.

Do not include:
- "Source:"
- "Sources:"
- "Original source:"
- "Article source:"
- "Story source:"
- "News source:"
- "Originally published by..."
- "Originally published on..."
- "Read more..."
- "Continue reading..."
- "Read the full story..."
- "Via..."
- "Courtesy of..."
- "Visit..."
- "Follow us..."
- Website URLs
- Links to the original article
- The original website name as a promotional or attribution statement

IMPORTANT:
A person's name, company name, organization name, government agency, sports team, product, location, or other factual entity should NOT be removed merely because it is also associated with the original source.

For example, if the source reports that "Microsoft announced..." the word Microsoft is factual information and should remain.

FACTUAL RULES:
- Use ONLY information contained in the supplied source material.
- Do not invent facts.
- Do not invent names.
- Do not invent dates.
- Do not invent locations.
- Do not invent statistics.
- Do not invent quotes.
- Do not invent events.
- Do not invent statements from people.
- Do not invent motives.
- Do not invent background information.
- Do not assume facts that are not explicitly supported.
- Preserve names, numbers, dates and quotations accurately.
- If two pieces of supplied material appear to conflict, do not create a new fact.
- Never manufacture information merely to reach the desired word count.

ARTICLE LENGTH:
- Aim for 1,000 to 1,300 words when the supplied material contains enough information.
- Aim for approximately 1,150 words when possible.
- If the source material is genuinely short, write a shorter complete article.
- A shorter factual article is better than a longer article containing invented information.
- Never repeat the same fact simply to increase word count.

ARTICLE STRUCTURE:
Create a complete news article with:
- A strong, accurate headline.
- A compelling opening paragraph.
- Several well-developed paragraphs.
- Clear H2 subheadings where useful.
- A logical progression of information.
- Important facts near the beginning.
- Additional confirmed details later in the story.
- A strong closing paragraph based only on confirmed information.

WRITING STYLE:
- Professional digital journalism.
- Natural human-readable writing.
- Clear and informative.
- Engaging but not sensational.
- Avoid clickbait.
- Avoid exaggerated language.
- Avoid repetitive wording.
- Avoid filler.
- Avoid unnecessary adjectives.
- Use short paragraphs suitable for mobile readers.
- Explain the significance of confirmed information without adding unsupported analysis.

HEADLINE:
Create a stronger headline if the supplied information supports one.
The headline must remain factually accurate.
Do not exaggerate.

QUOTES:
If the source material contains a quotation:
- Preserve the meaning accurately.
- Do not invent quotations.
- Do not attribute a statement to a person unless the supplied material does so.

FINAL ARTICLE:
The article should read as a standalone JNMulee News article.

Do not tell readers where the source material came from.

Do not include source attribution unless it is itself an important factual part of the news event.

Do not include the original source URL.

HTML:
Return ONLY valid JSON.

Use exactly this structure:

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

Do not use:
- Markdown
- Code fences
- Scripts
- Styles
- Links
- Images
- Tables
            `.trim(),
          },

          {
            role: "user",
            content: `
CATEGORY:
${category}

ORIGINAL FEED HEADLINE:
${title}

FACTUAL SOURCE MATERIAL:
${content}
            `.trim(),
          },
        ],
      });

    let text =
      response.choices[0]?.message?.content?.trim();

    if (!text) {
      return null;
    }

    text = text
      .replace(
        /^```json/i,
        ""
      )
      .replace(
        /^```/i,
        ""
      )
      .replace(
        /```$/i,
        ""
      )
      .trim();

    let parsed: {
      headline?: string;
      article_html?: string;
    };

    try {
      parsed =
        JSON.parse(text);
    } catch {
      console.error(
        "OpenAI returned invalid JSON."
      );

      return null;
    }

    const headline =
      cleanText(
        parsed.headline
      );

    let articleHtml =
      parsed.article_html || "";

    if (
      !headline ||
      !articleHtml
    ) {
      return null;
    }

    articleHtml =
      sanitizeArticleHtml(
        articleHtml
      );

    /*
     * Second cleanup pass after
     * OpenAI generation.
     */
    articleHtml =
      removeSourceAttributionHtml(
        articleHtml
      );

    const articleText =
      cleanText(
        articleHtml
      );

    const count =
      wordCount(articleText);

    if (count < 120) {
      console.error(
        `OpenAI article was too short: ${count} words`
      );

      return null;
    }

    return {
      headline,
      articleHtml,
      wordCount: count,
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
/* Main importer                                                              */
/* -------------------------------------------------------------------------- */

export async function GET() {
  let processed = 0;
  let generated = 0;
  let published = 0;
  let skipped = 0;
  let skippedNoImage = 0;
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
           * Check duplicate before doing
           * expensive article/OpenAI work.
           */
          const {
            data: duplicate,
            error: duplicateError,
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
            ) ||
            source.category ||
            null;

          /* -------------------------------------------------------------- */
          /* Full article page                                                */
          /* -------------------------------------------------------------- */

          const articlePage =
            await fetchArticlePage(
              link
            );

          if (
            articlePage.fetched &&
            articlePage.content
          ) {
            articlePagesFetched++;
          } else {
            articlePagesFailed++;
          }

          /* -------------------------------------------------------------- */
          /* Source material                                                  */
          /* -------------------------------------------------------------- */

          const sourceMaterial =
            buildSourceMaterial({
              title,
              rssContent,
              articlePageContent:
                articlePage.content,
            });

          /* -------------------------------------------------------------- */
          /* Category                                                         */
          /* -------------------------------------------------------------- */

          const category =
            classifyCategory(
              title,
              `${rssContent} ${articlePage.content}`,
              sourceCategory
            );

          let finalTitle =
            title;

          let finalContent =
            "";

          /* -------------------------------------------------------------- */
          /* OpenAI reconstruction                                            */
          /* -------------------------------------------------------------- */

          const generatedArticle =
            await createLongOriginalArticle({
              title,
              content:
                sourceMaterial ||
                rssContent ||
                title,
              category,
            });

          if (
            generatedArticle
          ) {
            finalTitle =
              generatedArticle.headline;

            finalContent =
              formatReadableArticleHtml(
                generatedArticle.articleHtml
              );

            aiGenerated++;
          } else if (
            rssContent
          ) {
            finalContent =
              formatReadableArticleHtml(
                textToHtml(
                  rssContent
                )
              );
          } else if (
            articlePage.content
          ) {
            finalContent =
              formatReadableArticleHtml(
                textToHtml(
                  articlePage.content
                )
              );
          } else {
            finalContent =
              formatReadableArticleHtml(
                textToHtml(
                  title
                )
              );
          }

          finalTitle =
            cleanText(
              finalTitle
            );

          if (
            !finalTitle
          ) {
            finalTitle =
              title;
          }

          if (
            !finalContent
          ) {
            finalContent =
              formatReadableArticleHtml(
                textToHtml(
                  rssContent ||
                    articlePage.content ||
                    title
                )
              );
          }

          /*
           * Final cleanup immediately before
           * saving to Supabase.
           *
           * This is the last protection against
           * unwanted attribution text.
           */
          finalContent =
            removeSourceAttributionHtml(
              finalContent
            );

          finalContent =
            formatReadableArticleHtml(
              finalContent
            );

          /* -------------------------------------------------------------- */
          /* Final image check                                                */
          /* -------------------------------------------------------------- */

          if (
            !imageUrl ||
            !/^https?:\/\//i.test(
              imageUrl
            )
          ) {
            skippedNoImage++;
            continue;
          }

          /* -------------------------------------------------------------- */
          /* Final content check                                              */
          /* -------------------------------------------------------------- */

          if (
            wordCount(
              finalContent
            ) < 20
          ) {
            skipped++;

            errors.push(
              `${finalTitle}: article content was too short`
            );

            continue;
          }

          /* -------------------------------------------------------------- */
          /* Insert                                                           */
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
               * Kept in database for
               * duplicate detection.
               *
               * It is NOT included in
               * the visible article content.
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

      aiGenerated,

      articlePagesFetched,

      articlePagesFailed,

      errors,

      message:
        "JNMulee News RSS → article page → cleaned content → OpenAI reconstruction import completed.",
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

        aiGenerated,

        articlePagesFetched,

        articlePagesFailed,

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