import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

const AI_MODEL =
  process.env.OPENAI_MODEL || "gpt-4o-mini";

/*
|--------------------------------------------------------------------------
| LARGE CONTENT SETTINGS
|--------------------------------------------------------------------------
*/

const MAX_SOURCES_PER_BATCH = 5;
const MAX_FEED_ITEMS_PER_SOURCE = 10;

const FEED_FETCH_TIMEOUT_MS = 10000;
const ARTICLE_FETCH_TIMEOUT_MS = 10000;

const MIN_SOURCE_WORDS = 120;
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
] as const;

type Category =
  (typeof ALLOWED_CATEGORIES)[number];

type SourceRow = {
  id: string;
  name: string | null;
  feed_url: string;
  category?: string | null;
  active: boolean | null;
};

type FeedItem = {
  title: string;
  link: string;
  description: string;
  content: string;
  pubDate: string | null;
  imageUrl: string | null;
};

type Material = {
  title: string;
  url: string;
  publishedAt: string | null;
  imageUrl: string | null;
  text: string;
};

type ErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  details?: string;
  hint?: string;
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function errorMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value
  ) {
    return String(
      (value as ErrorLike).message || value
    );
  }

  return String(value);
}

function errorCode(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "code" in value
  ) {
    return String(
      (value as ErrorLike).code || ""
    );
  }

  return "";
}

function getStatus(value: unknown): number | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "status" in value
  ) {
    const status = Number(
      (value as ErrorLike).status
    );

    return Number.isFinite(status)
      ? status
      : undefined;
  }

  return undefined;
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(
      /<!\[CDATA\[([\s\S]*?)\]\]>/gi,
      "$1"
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(
      /&#(\d+);/g,
      (_, n) =>
        String.fromCharCode(Number(n))
    )
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, n) =>
        String.fromCharCode(
          parseInt(n, 16)
        )
    );
}

function wordCount(value: string): number {
  return normalizeWhitespace(
    value.replace(/<[^>]*>/g, " ")
  )
    .split(/\s+/)
    .filter(Boolean).length;
}

function slugify(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function textToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph.trim()
        ? `<p>${paragraph.trim()}</p>`
        : ""
    )
    .filter(Boolean)
    .join("\n");
}

function cleanText(value: string): string {
  let text = value || "";

  text = text.replace(
    /<script[\s\S]*?<\/script>/gi,
    " "
  );

  text = text.replace(
    /<style[\s\S]*?<\/style>/gi,
    " "
  );

  text = text.replace(
    /<noscript[\s\S]*?<\/noscript>/gi,
    " "
  );

  text = text.replace(
    /<(iframe|svg|canvas|form|nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi,
    " "
  );

  text = text.replace(
    /<br\s*\/?>/gi,
    "\n"
  );

  text = text.replace(
    /<\/(p|div|article|section|li|h1|h2|h3|h4|h5|h6)>/gi,
    "\n\n"
  );

  text = text.replace(
    /<[^>]+>/g,
    " "
  );

  text = decodeHtml(text);

  text = normalizeWhitespace(text);

  const badPatterns = [
    /originally published[\s\S]{0,500}/gi,
    /this story was originally published[\s\S]{0,500}/gi,
    /this story continues[\s\S]{0,500}/gi,
    /continue reading[\s\S]{0,300}/gi,
    /read more[\s\S]{0,300}/gi,
    /follow us[\s\S]{0,300}/gi,
    /subscribe to our newsletter[\s\S]{0,500}/gi,
    /sign up for our newsletter[\s\S]{0,500}/gi,
    /related stories[\s\S]{0,1000}/gi,
    /related articles[\s\S]{0,1000}/gi,
    /recommended stories[\s\S]{0,1000}/gi,
    /advertisement[\s\S]{0,500}/gi,
    /sponsored content[\s\S]{0,500}/gi,
    /download our app[\s\S]{0,500}/gi,
    /cookie policy[\s\S]{0,500}/gi,
    /privacy policy[\s\S]{0,500}/gi,
  ];

  for (const pattern of badPatterns) {
    text = text.replace(pattern, "");
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => normalizeWhitespace(p))
    .filter(Boolean);

  const seen = new Set<string>();
  const output: string[] = [];

  for (const paragraph of paragraphs) {
    const key = paragraph
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(paragraph);
  }

  return normalizeWhitespace(
    output.join("\n\n")
  );
}

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function extractTag(
  xml: string,
  names: string[]
): string {
  for (const name of names) {
    const escaped = name.replace(
      /[-/\\^$*+?.()|[\]{}]/g,
      "\\$&"
    );

    const match = xml.match(
      new RegExp(
        `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`,
        "i"
      )
    );

    if (match?.[1]) {
      return decodeHtml(match[1]);
    }
  }

  return "";
}

function extractAttribute(
  tag: string,
  attribute: string
): string {
  const match = tag.match(
    new RegExp(
      `${attribute}\\s*=\\s*["']([^"']+)["']`,
      "i"
    )
  );

  return match?.[1] || "";
}

function extractImage(value: string): string | null {
  if (!value) {
    return null;
  }

  const image =
    value.match(
      /https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/i
    )?.[0] || null;

  if (image) {
    return image.replace(/&amp;/g, "&");
  }

  return (
    value.match(
      /https?:\/\/[^\s"'<>]+/i
    )?.[0]
      ?.replace(/&amp;/g, "&")
      .replace(/[)"'<>]+$/, "") ||
    null
  );
}

/*
|--------------------------------------------------------------------------
| RSS / ATOM PARSER
|--------------------------------------------------------------------------
*/

function parseFeed(xml: string): FeedItem[] {
  const rss =
    xml.match(
      /<item\b[\s\S]*?<\/item>/gi
    ) || [];

  const atom =
    xml.match(
      /<entry\b[\s\S]*?<\/entry>/gi
    ) || [];

  const blocks =
    rss.length > 0 ? rss : atom;

  const results: FeedItem[] = [];

  for (const block of blocks) {
    const title = normalizeWhitespace(
      extractTag(block, ["title"])
    );

    let link = extractTag(
      block,
      ["link"]
    );

    if (!link) {
      const linkTag =
        block.match(
          /<link\b[^>]*>/i
        )?.[0] || "";

      link = extractAttribute(
        linkTag,
        "href"
      );
    }

    const description =
      extractTag(block, [
        "content:encoded",
        "description",
        "summary",
        "content",
      ]);

    const content =
      extractTag(block, [
        "content:encoded",
        "content",
        "description",
      ]);

    const pubDate =
      normalizeWhitespace(
        extractTag(block, [
          "pubDate",
          "published",
          "updated",
          "dc:date",
        ])
      ) || null;

    let imageUrl: string | null =
      null;

    const mediaTags =
      block.match(
        /<media:content\b[^>]*>/gi
      ) || [];

    for (const tag of mediaTags) {
      const url = extractAttribute(
        tag,
        "url"
      );

      if (url) {
        imageUrl = url;
        break;
      }
    }

    if (!imageUrl) {
      const thumbnailTags =
        block.match(
          /<media:thumbnail\b[^>]*>/gi
        ) || [];

      for (const tag of thumbnailTags) {
        const url = extractAttribute(
          tag,
          "url"
        );

        if (url) {
          imageUrl = url;
          break;
        }
      }
    }

    if (!imageUrl) {
      const enclosureTags =
        block.match(
          /<enclosure\b[^>]*>/gi
        ) || [];

      for (const tag of enclosureTags) {
        const url = extractAttribute(
          tag,
          "url"
        );

        const type = extractAttribute(
          tag,
          "type"
        );

        if (
          url &&
          (!type ||
            type.startsWith("image/"))
        ) {
          imageUrl = url;
          break;
        }
      }
    }

    if (!imageUrl) {
      imageUrl =
        extractImage(content);
    }

    if (!imageUrl) {
      imageUrl =
        extractImage(description);
    }

    if (
      title &&
      link &&
      isSafeUrl(link)
    ) {
      results.push({
        title,
        link: link.trim(),
        description:
          cleanText(description),
        content:
          cleanText(content),
        pubDate,
        imageUrl,
      });
    }
  }

  return results;
}

/*
|--------------------------------------------------------------------------
| FETCH
|--------------------------------------------------------------------------
*/

async function fetchExternal(
  url: string,
  timeoutMs: number
): Promise<{
  ok: boolean;
  status: number;
  text: string;
}> {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response =
      await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; JNMuleeNewsBot/1.0)",
          Accept:
            "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8",
        },
        cache: "no-store",
      });

    const text =
      await response.text();

    return {
      ok: response.ok,
      status: response.status,
      text,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      text: "",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/*
|--------------------------------------------------------------------------
| ARTICLE EXTRACTION
|--------------------------------------------------------------------------
*/

async function fetchArticlePage(
  url: string
): Promise<{
  text: string;
  imageUrl: string | null;
}> {
  const response =
    await fetchExternal(
      url,
      ARTICLE_FETCH_TIMEOUT_MS
    );

  if (!response.ok || !response.text) {
    return {
      text: "",
      imageUrl: null,
    };
  }

  const html = response.text;

  let imageUrl: string | null =
    null;

  const imagePatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];

  for (const pattern of imagePatterns) {
    const match =
      html.match(pattern);

    if (match?.[1]) {
      imageUrl = match[1];
      break;
    }
  }

  if (!imageUrl) {
    const imageMatch =
      html.match(
        /<img[^>]+(?:src|data-src)=["']([^"']+)["']/i
      );

    if (imageMatch?.[1]) {
      imageUrl =
        imageMatch[1];
    }
  }

  const candidates: string[] =
    [];

  const article =
    html.match(
      /<article\b[^>]*>([\s\S]*?)<\/article>/i
    );

  if (article?.[1]) {
    candidates.push(article[1]);
  }

  const main =
    html.match(
      /<main\b[^>]*>([\s\S]*?)<\/main>/i
    );

  if (main?.[1]) {
    candidates.push(main[1]);
  }

  const containers = [
    /<div[^>]+class=["'][^"']*(?:article-body|article-content|post-content|entry-content|story-body|story-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,

    /<div[^>]+id=["'][^"']*(?:article-body|article-content|post-content|entry-content|story-body|story-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of containers) {
    const match =
      html.match(pattern);

    if (match?.[1]) {
      candidates.push(match[1]);
    }
  }

  const cleaned =
    candidates
      .map(cleanText)
      .filter(
        (text) =>
          wordCount(text) >=
          MIN_SOURCE_WORDS
      )
      .sort(
        (a, b) =>
          wordCount(b) -
          wordCount(a)
      );

  return {
    text: cleaned[0] || "",
    imageUrl:
      imageUrl &&
      isSafeUrl(imageUrl)
        ? imageUrl
        : null,
  };
}

/*
|--------------------------------------------------------------------------
| MATERIAL
|--------------------------------------------------------------------------
*/

function buildMaterial(
  item: FeedItem,
  articleText: string,
  articleImage: string | null
): Material {
  const feedText = cleanText(
    [
      item.description,
      item.content,
    ]
      .filter(Boolean)
      .join("\n\n")
  );

  const text =
    articleText &&
    wordCount(articleText) >=
      MIN_SOURCE_WORDS
      ? articleText
      : feedText;

  return {
    title: item.title,
    url: item.link,
    publishedAt: item.pubDate,
    imageUrl:
      articleImage ||
      item.imageUrl ||
      null,
    text: cleanText(text),
  };
}

/*
|--------------------------------------------------------------------------
| CATEGORY
|--------------------------------------------------------------------------
*/

function classifyCategory(
  title: string,
  text: string,
  sourceCategory?: string | null
): Category {
  const supplied =
    sourceCategory?.trim();

  if (
    supplied &&
    (
      ALLOWED_CATEGORIES as readonly string[]
    ).includes(supplied)
  ) {
    return supplied as Category;
  }

  const value =
    `${title} ${text}`.toLowerCase();

  if (
    /bitcoin|ethereum|crypto|cryptocurrency|blockchain|coinbase|binance|token/i.test(
      value
    )
  ) {
    return "Crypto";
  }

  if (
    /premier league|football|soccer|champions league|fifa|uefa|arsenal|chelsea|liverpool|manchester|barcelona|real madrid|sports|nba|tennis/i.test(
      value
    )
  ) {
    return "Sports";
  }

  if (
    /iphone|android|google|microsoft|apple|openai|artificial intelligence|ai |technology|tech company|software|chip/i.test(
      value
    )
  ) {
    return "Technology";
  }

  if (
    /business|economy|stock market|shares|bank|investment|company|market|finance|ceo/i.test(
      value
    )
  ) {
    return "Business";
  }

  if (
    /celebrity|actor|actress|movie|film|music|singer|album|hollywood|nollywood/i.test(
      value
    )
  ) {
    return "Entertainment";
  }

  if (
    /gossip|relationship|dating|girlfriend|boyfriend|rumour|rumor/i.test(
      value
    )
  ) {
    return "Gossip";
  }

  if (
    /nigeria|lagos|abuja|naira|president|governor|senate|house of representatives/i.test(
      value
    )
  ) {
    return "Nigeria";
  }

  if (
    /politics|election|government|minister|party|politician/i.test(
      value
    )
  ) {
    return "Politics";
  }

  return "World";
}

/*
|--------------------------------------------------------------------------
| AI
|--------------------------------------------------------------------------
*/

async function generateArticle(
  material: Material
): Promise<{
  article: string | null;
  creditsUnavailable: boolean;
  error: string | null;
}> {
  if (!openai) {
    return {
      article: null,
      creditsUnavailable: false,
      error:
        "OPENAI_API_KEY is missing",
    };
  }

  const prompt = `
Create an original JNMulee News article using ONLY the verified material below.

TITLE:
${material.title}

DATE:
${material.publishedAt || "Unknown"}

VERIFIED MATERIAL:
${material.text}

Rules:

- Write completely original wording.
- Do not copy source sentences.
- Do not mention the source publication.
- Do not mention the source website.
- Do not mention that the article was imported.
- Do not mention AI.
- Do not include URLs.
- Do not include source bylines.
- Do not include advertisements.
- Do not invent facts.
- Do not invent quotes.
- Do not invent statistics.
- Do not invent people or events.
- Preserve uncertainty when the supplied material is uncertain.
- Use a professional news style.
- Start with the most important verified development.
- Use clear paragraphs.
- Aim for 500–900 words when the supplied material supports it.
- Minimum 180 words.

If the supplied material genuinely does not contain enough information for a useful article, return exactly:

INSUFFICIENT_SOURCE_MATERIAL

Return only the finished article.
`;

  try {
    const completion =
      await openai.chat.completions.create(
        {
          model: AI_MODEL,
          temperature: 0.3,
          max_tokens: 2200,
          messages: [
            {
              role: "system",
              content:
                "You are a senior professional news editor for JNMulee News. Accuracy is more important than length. Never invent facts.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }
      );

    const result =
      completion.choices[0]
        ?.message?.content
        ?.trim();

    if (!result) {
      return {
        article: null,
        creditsUnavailable: false,
        error:
          "OpenAI returned an empty response",
      };
    }

    if (
      result
        .toUpperCase()
        .trim() ===
      "INSUFFICIENT_SOURCE_MATERIAL"
    ) {
      return {
        article: null,
        creditsUnavailable: false,
        error:
          "AI reported insufficient source material",
      };
    }

    return {
      article: result,
      creditsUnavailable: false,
      error: null,
    };
  } catch (error) {
    const message =
      errorMessage(error);

    const status =
      getStatus(error);

    if (
      status === 429 ||
      /insufficient_quota|quota|credit_balance_exhausted|no credits|credits remaining|billing/i.test(
        message
      )
    ) {
      return {
        article: null,
        creditsUnavailable: true,
        error:
          "OpenAI API credits/quota unavailable",
      };
    }

    return {
      article: null,
      creditsUnavailable: false,
      error:
        `OpenAI error: ${message}`,
    };
  }
}

/*
|--------------------------------------------------------------------------
| QUALITY
|--------------------------------------------------------------------------
*/

function containsForbiddenContent(
  article: string
): boolean {
  return /originally published|source:|via:|read more at|continue reading at|according to .* website/i.test(
    article
  );
}

function qualityScore(
  article: string
): number {
  let score = 100;

  const words =
    wordCount(article);

  if (words < 180) {
    score -= 40;
  }

  if (words < 250) {
    score -= 10;
  }

  if (
    containsForbiddenContent(
      article
    )
  ) {
    score -= 40;
  }

  if (
    article.length < 700
  ) {
    score -= 10;
  }

  return score;
}

/*
|--------------------------------------------------------------------------
| INSERT
|--------------------------------------------------------------------------
*/

async function insertArticle(
  material: Material,
  category: Category,
  article: string,
  source: SourceRow
): Promise<{
  inserted: boolean;
  duplicate: boolean;
  error: string | null;
}> {
  if (
    !material.imageUrl ||
    !isSafeUrl(material.imageUrl)
  ) {
    return {
      inserted: false,
      duplicate: false,
      error:
        "IMAGE_REQUIRED",
    };
  }

  const title =
    normalizeWhitespace(
      material.title
    );

  let slug =
    slugify(title) ||
    `jnmulee-${Date.now()}`;

  const existingSlug =
    await supabase
      .from("news")
      .select("id")
      .eq("slug", slug)
      .limit(1);

  if (existingSlug.error) {
    return {
      inserted: false,
      duplicate: false,
      error:
        `Slug check failed: ${existingSlug.error.message}`,
    };
  }

  if (
    existingSlug.data &&
    existingSlug.data.length > 0
  ) {
    slug =
      `${slug}-${Date.now()}`;
  }

  /*
   * Final duplicate check.
   */
  const existingSource =
    await supabase
      .from("news")
      .select("id")
      .eq(
        "source_url",
        material.url
      )
      .limit(1);

  if (existingSource.error) {
    return {
      inserted: false,
      duplicate: false,
      error:
        `Source duplicate check failed: ${existingSource.error.message}`,
    };
  }

  if (
    existingSource.data &&
    existingSource.data.length > 0
  ) {
    return {
      inserted: false,
      duplicate: true,
      error: null,
    };
  }

  const payload = {
    title,
    slug,
    content:
      textToHtml(article),
    image_url:
      material.imageUrl,
    Published: false,
    source_url:
      material.url,
    category,
    content_type:
      "syndicated",
    source_name:
      source.name ||
      "Unknown Source",
    canonical_url:
      material.url,
    attribution_text:
      "Published by JNMulee News",
  };

  const result =
    await supabase
      .from("news")
      .insert(payload);

  if (result.error) {
    if (
      result.error.code ===
      "23505"
    ) {
      return {
        inserted: false,
        duplicate: true,
        error: null,
      };
    }

    return {
      inserted: false,
      duplicate: false,
      error:
        result.error.message,
    };
  }

  return {
    inserted: true,
    duplicate: false,
    error: null,
  };
}

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/

async function authorizeRequest(
  request: Request
): Promise<boolean> {
  const cronSecret =
    process.env.CRON_SECRET;

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    cronSecret &&
    authorization ===
      `Bearer ${cronSecret}`
  ) {
    return true;
  }

  if (
    !authorization?.startsWith(
      "Bearer "
    )
  ) {
    return false;
  }

  const token =
    authorization
      .slice(7)
      .trim();

  if (!token) {
    return false;
  }

  const authClient =
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

  const {
    data,
    error,
  } =
    await authClient.auth.getUser(
      token
    );

  if (error || !data.user) {
    return false;
  }

  return (
    data.user.app_metadata
      ?.role === "admin"
  );
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

export async function GET(
  request: Request
) {
  const authorized =
    await authorizeRequest(
      request
    );

  if (!authorized) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const startedAt =
    Date.now();

  const url =
    new URL(request.url);

  const batchParam =
    url.searchParams.get(
      "batch"
    );

  const manual =
    url.searchParams.get(
      "manual"
    ) === "true";

  let requestedBatch =
    batchParam &&
    /^\d+$/.test(batchParam)
      ? Number(batchParam)
      : 0;

  if (
    !Number.isFinite(
      requestedBatch
    ) ||
    requestedBatch < 0
  ) {
    requestedBatch = 0;
  }

  const stats = {
    sourcesProcessed: 0,
    feedItemsSeen: 0,
    articlePagesFetched: 0,
    aiGenerated: 0,
    articlesAddedForApproval: 0,
    articlesSkipped: 0,
    skippedDuplicate: 0,
    skippedNoImage: 0,
    skippedShortSource: 0,
    skippedPoorQuality: 0,
    feedFetchFailed: 0,
    articleFetchFailed: 0,
    aiFailed: 0,
  };

  const diagnostics: string[] =
    [];

  let aiCreditsUnavailable =
    false;

  try {
    /*
     * Load active sources.
     */
    const {
      data: sources,
      error: sourcesError,
    } =
      await supabase
        .from("sources")
        .select(
          "id,name,feed_url,category,active"
        )
        .eq(
          "active",
          true
        )
        .order("id", {
          ascending: true,
        });

    if (sourcesError) {
      throw new Error(
        `Unable to load sources: ${sourcesError.message}`
      );
    }

    const allSources =
      (sources || []) as SourceRow[];

    const totalBatches =
      Math.max(
        1,
        Math.ceil(
          allSources.length /
            MAX_SOURCES_PER_BATCH
        )
      );

    /*
     * Manual batch selection.
     */
    const batch =
      requestedBatch %
      totalBatches;

    const start =
      batch *
      MAX_SOURCES_PER_BATCH;

    const batchSources =
      allSources.slice(
        start,
        start +
          MAX_SOURCES_PER_BATCH
      );

    diagnostics.push(
      `Active sources: ${allSources.length}`
    );

    diagnostics.push(
      `Batch: ${batch}/${totalBatches - 1}`
    );

    diagnostics.push(
      `Sources in this batch: ${batchSources.length}`
    );

    diagnostics.push(
      `Feed limit per source: ${MAX_FEED_ITEMS_PER_SOURCE}`
    );

    diagnostics.push(
      `OpenAI configured: ${openai ? "YES" : "NO"}`
    );

    diagnostics.push(
      `AI model: ${AI_MODEL}`
    );

    if (
      batchSources.length ===
      0
    ) {
      return NextResponse.json({
        success: true,
        message:
          `Batch ${batch} contains no sources.`,
        batch,
        totalSources:
          allSources.length,
        totalBatches,
        ...stats,
        diagnostics,
        durationMs:
          Date.now() -
          startedAt,
      });
    }

    /*
     * Process each source.
     */
    for (const source of batchSources) {
      if (
        aiCreditsUnavailable
      ) {
        break;
      }

      stats.sourcesProcessed++;

      const sourceName =
        source.name ||
        source.id;

      if (
        !source.feed_url ||
        !isSafeUrl(
          source.feed_url
        )
      ) {
        diagnostics.push(
          `${sourceName}: INVALID FEED URL`
        );

        stats.feedFetchFailed++;

        continue;
      }

      /*
       * Fetch RSS.
       */
      const feed =
        await fetchExternal(
          source.feed_url,
          FEED_FETCH_TIMEOUT_MS
        );

      if (
        !feed.ok ||
        !feed.text
      ) {
        diagnostics.push(
          `${sourceName}: FEED FAILED HTTP ${feed.status || "timeout"}`
        );

        stats.feedFetchFailed++;

        continue;
      }

      const items =
        parseFeed(feed.text).slice(
          0,
          MAX_FEED_ITEMS_PER_SOURCE
        );

      stats.feedItemsSeen +=
        items.length;

      diagnostics.push(
        `${sourceName}: ${items.length} feed items found`
      );

      if (
        items.length === 0
      ) {
        diagnostics.push(
          `${sourceName}: RSS returned no readable items`
        );

        continue;
      }

      /*
       * Process feed items.
       */
      for (const item of items) {
        if (
          aiCreditsUnavailable
        ) {
          break;
        }

        /*
         * Duplicate check BEFORE expensive article fetching.
         */
        const existing =
          await supabase
            .from("news")
            .select("id")
            .eq(
              "source_url",
              item.link
            )
            .limit(1);

        if (existing.error) {
          diagnostics.push(
            `${sourceName}: duplicate check failed: ${existing.error.message}`
          );

          stats.articlesSkipped++;

          continue;
        }

        if (
          existing.data &&
          existing.data.length > 0
        ) {
          stats.skippedDuplicate++;
          stats.articlesSkipped++;

          diagnostics.push(
            `${sourceName}: DUPLICATE — ${item.title}`
          );

          continue;
        }

        /*
         * Fetch full article.
         */
        const articlePage =
          await fetchArticlePage(
            item.link
          );

        if (
          articlePage.text
        ) {
          stats.articlePagesFetched++;
        } else {
          stats.articleFetchFailed++;

          diagnostics.push(
            `${sourceName}: ARTICLE EXTRACTION FAILED — ${item.title}`
          );
        }

        const material =
          buildMaterial(
            item,
            articlePage.text,
            articlePage.imageUrl
          );

        /*
         * Image requirement.
         */
        if (
          !material.imageUrl ||
          !isSafeUrl(
            material.imageUrl
          )
        ) {
          stats.skippedNoImage++;
          stats.articlesSkipped++;

          diagnostics.push(
            `${sourceName}: NO IMAGE — ${item.title}`
          );

          continue;
        }

        /*
         * Minimum source material.
         */
        const sourceWords =
          wordCount(
            material.text
          );

        if (
          sourceWords <
          MIN_SOURCE_WORDS
        ) {
          stats.skippedShortSource++;
          stats.articlesSkipped++;

          diagnostics.push(
            `${sourceName}: TOO SHORT (${sourceWords} words) — ${item.title}`
          );

          continue;
        }

        /*
         * Generate AI article.
         */
        const ai =
          await generateArticle(
            material
          );

        if (
          ai.creditsUnavailable
        ) {
          aiCreditsUnavailable =
            true;

          diagnostics.push(
            `${sourceName}: OPENAI CREDITS/QUOTA UNAVAILABLE`
          );

          break;
        }

        if (!ai.article) {
          stats.aiFailed++;
          stats.articlesSkipped++;

          diagnostics.push(
            `${sourceName}: AI FAILED — ${ai.error || "unknown AI error"} — ${item.title}`
          );

          continue;
        }

        stats.aiGenerated++;

        /*
         * Final quality check.
         */
        const finalWords =
          wordCount(
            ai.article
          );

        if (
          finalWords <
          MIN_FINAL_WORDS
        ) {
          stats.skippedPoorQuality++;
          stats.articlesSkipped++;

          diagnostics.push(
            `${sourceName}: AI ARTICLE TOO SHORT (${finalWords} words) — ${item.title}`
          );

          continue;
        }

        if (
          containsForbiddenContent(
            ai.article
          )
        ) {
          stats.skippedPoorQuality++;
          stats.articlesSkipped++;

          diagnostics.push(
            `${sourceName}: AI ARTICLE FAILED CONTENT CHECK — ${item.title}`
          );

          continue;
        }

        const score =
          qualityScore(
            ai.article
          );

        if (score < 70) {
          stats.skippedPoorQuality++;
          stats.articlesSkipped++;

          diagnostics.push(
            `${sourceName}: QUALITY SCORE ${score} — ${item.title}`
          );

          continue;
        }

        const category =
          classifyCategory(
            material.title,
            material.text,
            source.category
          );

        /*
         * Insert.
         */
        const inserted =
          await insertArticle(
            material,
            category,
            ai.article,
            source
          );

        if (
          inserted.duplicate
        ) {
          stats.skippedDuplicate++;
          stats.articlesSkipped++;

          diagnostics.push(
            `${sourceName}: DUPLICATE AT INSERT — ${item.title}`
          );

          continue;
        }

        if (
          inserted.error
        ) {
          if (
            inserted.error ===
            "IMAGE_REQUIRED"
          ) {
            stats.skippedNoImage++;
          }

          stats.articlesSkipped++;

          diagnostics.push(
            `${sourceName}: INSERT FAILED — ${inserted.error} — ${item.title}`
          );

          continue;
        }

        if (
          inserted.inserted
        ) {
          stats.articlesAddedForApproval++;

          diagnostics.push(
            `${sourceName}: ADDED FOR APPROVAL — ${item.title}`
          );
        }
      }
    }

    /*
     * Final diagnostic summary.
     */
    diagnostics.push(
      "------------------------------"
    );

    diagnostics.push(
      `SUMMARY: ${stats.feedItemsSeen} feed items found`
    );

    diagnostics.push(
      `SUMMARY: ${stats.aiGenerated} AI articles generated`
    );

    diagnostics.push(
      `SUMMARY: ${stats.articlesAddedForApproval} articles added for approval`
    );

    diagnostics.push(
      `SUMMARY: ${stats.skippedDuplicate} duplicates`
    );

    diagnostics.push(
      `SUMMARY: ${stats.skippedNoImage} missing images`
    );

    diagnostics.push(
      `SUMMARY: ${stats.skippedShortSource} insufficient source material`
    );

    diagnostics.push(
      `SUMMARY: ${stats.skippedPoorQuality} poor-quality articles`
    );

    diagnostics.push(
      `SUMMARY: ${stats.feedFetchFailed} feed failures`
    );

    diagnostics.push(
      `SUMMARY: ${stats.articleFetchFailed} article extraction failures`
    );

    diagnostics.push(
      `SUMMARY: ${stats.aiFailed} other AI failures`
    );

    diagnostics.push(
      `SUMMARY: OpenAI credits unavailable = ${
        aiCreditsUnavailable
          ? "YES"
          : "NO"
      }`
    );

    return NextResponse.json(
      {
        success: true,

        message:
          `Batch ${batch} completed: ${stats.articlesAddedForApproval} new AI-generated article(s) added for approval.`,

        batch,

        totalSources:
          allSources.length,

        totalBatches,

        batchSources:
          batchSources.map(
            (source) =>
              source.name ||
              source.id
          ),

        ...stats,

        aiCreditsUnavailable,

        diagnostics,

        durationMs:
          Date.now() -
          startedAt,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    const message =
      errorMessage(error);

    diagnostics.push(
      `FATAL ERROR: ${message}`
    );

    return NextResponse.json(
      {
        success: false,
        message,
        ...stats,
        aiCreditsUnavailable,
        diagnostics,
        durationMs:
          Date.now() -
          startedAt,
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}