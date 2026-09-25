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

const AI_MODEL =
  process.env.OPENAI_MODEL || "gpt-4o-mini";

const MAX_SOURCES_PER_BATCH = 5;
const MAX_FEED_ITEMS_PER_SOURCE = 3;

const FEED_FETCH_TIMEOUT_MS = 7_000;
const ARTICLE_FETCH_TIMEOUT_MS = 7_000;

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
] as const;

type Category = (typeof ALLOWED_CATEGORIES)[number];

type SourceRow = {
  id: string;
  name: string | null;
  feed_url: string;
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

function decodeHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) =>
      String.fromCharCode(Number(n))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    );
}

function normalizeWhitespace(value: string): string {
  return decodeHtml(value)
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dedupeParagraphs(value: string): string {
  const paragraphs = value
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

    if (!key || seen.has(key)) continue;

    seen.add(key);
    output.push(paragraph);
  }

  return output.join("\n\n");
}

function removeSourceBoilerplate(value: string): string {
  let text = value;

  const patterns = [
    /originally published(?:\s+by)?[\s\S]{0,500}/gi,
    /this story was originally published[\s\S]{0,500}/gi,
    /this story continues at[\s\S]{0,500}/gi,
    /read the original story[\s\S]{0,500}/gi,
    /read more[\s\S]{0,300}/gi,
    /continue reading[\s\S]{0,300}/gi,
    /follow us on[\s\S]{0,300}/gi,
    /follow us[\s\S]{0,300}/gi,
    /subscribe to our newsletter[\s\S]{0,500}/gi,
    /sign up for our newsletter[\s\S]{0,500}/gi,
    /related stories[\s\S]{0,1000}/gi,
    /related articles[\s\S]{0,1000}/gi,
    /recommended stories[\s\S]{0,1000}/gi,
    /most read[\s\S]{0,1000}/gi,
    /advertisement[\s\S]{0,500}/gi,
    /sponsored content[\s\S]{0,500}/gi,
    /sponsored[\s\S]{0,500}/gi,
    /download our app[\s\S]{0,500}/gi,
    /get our app[\s\S]{0,500}/gi,
    /cookie policy[\s\S]{0,500}/gi,
    /privacy policy[\s\S]{0,500}/gi,
  ];

  for (const pattern of patterns) {
    text = text.replace(pattern, "");
  }

  return text;
}

function removeAuthorBiography(value: string): string {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((p) => normalizeWhitespace(p))
    .filter(Boolean);

  const output: string[] = [];

  for (const paragraph of paragraphs) {
    const lower = paragraph.toLowerCase();

    const isBiography =
      (
        lower.includes("about the author") ||
        lower.includes("author bio") ||
        lower.includes("author biography") ||
        lower.includes("meet the author") ||
        lower.includes("about our author")
      ) &&
      paragraph.length < 1500;

    const isByline =
      /^by\s+[a-z][a-z .,'’-]{2,100}$/i.test(paragraph) ||
      /^written by\s+/i.test(paragraph) ||
      /^reporting by\s+/i.test(paragraph);

    if (isBiography || isByline) continue;

    output.push(paragraph);
  }

  return output.join("\n\n");
}

function removeAdvertising(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((p) => normalizeWhitespace(p))
    .filter(Boolean)
    .filter((paragraph) => {
      const lower = paragraph.toLowerCase();

      return !(
        lower.includes("buy now") ||
        lower.includes("shop now") ||
        lower.includes("limited time offer") ||
        lower.includes("special offer") ||
        lower.includes("sponsored by") ||
        lower.includes("affiliate link") ||
        lower.includes("promo code") ||
        lower.includes("use code ") ||
        lower.includes("advertisement")
      );
    })
    .join("\n\n");
}

function cleanText(value: string): string {
  let text = value;

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

  text = text.replace(/<br\s*\/?>/gi, "\n");

  text = text.replace(
    /<\/(p|div|article|section|li|h1|h2|h3|h4|h5|h6)>/gi,
    "\n\n"
  );

  text = text.replace(/<[^>]+>/g, " ");

  text = normalizeWhitespace(text);
  text = removeSourceBoilerplate(text);
  text = removeAuthorBiography(text);
  text = removeAdvertising(text);
  text = dedupeParagraphs(text);

  return normalizeWhitespace(text);
}

function extractTag(
  xml: string,
  tagNames: string[]
): string {
  for (const tag of tagNames) {
    const escaped = tag.replace(
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
  if (!value) return null;

  const direct =
    value.match(
      /https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/i
    )?.[0] || null;

  if (direct) return direct;

  const contentUrl =
    value.match(/https?:\/\/[^\s"'<>]+/i)?.[0] || null;

  if (contentUrl) {
    return contentUrl
      .replace(/&amp;/g, "&")
      .replace(/[)"'<>]+$/g, "");
  }

  return null;
}

function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];

  const rssItems =
    xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  const atomEntries =
    xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];

  const blocks =
    rssItems.length > 0
      ? rssItems
      : atomEntries;

  for (const block of blocks) {
    const title = normalizeWhitespace(
      extractTag(block, ["title"])
    );

    const description = extractTag(block, [
      "content:encoded",
      "content",
      "description",
      "summary",
    ]);

    const content = extractTag(block, [
      "content:encoded",
      "content",
    ]);

    let link = extractTag(block, ["link"]);

    if (!link) {
      const linkTag =
        block.match(/<link\b[^>]*>/i)?.[0] || "";

      link = extractAttribute(linkTag, "href");
    }

    const pubDate =
      normalizeWhitespace(
        extractTag(block, [
          "pubDate",
          "published",
          "updated",
          "dc:date",
        ])
      ) || null;

    let imageUrl: string | null = null;

    const mediaContent =
      block.match(/<media:content\b[^>]*>/gi) || [];

    for (const tag of mediaContent) {
      const url = extractAttribute(tag, "url");

      if (url) {
        imageUrl = url;
        break;
      }
    }

    if (!imageUrl) {
      const mediaThumbnail =
        block.match(/<media:thumbnail\b[^>]*>/gi) || [];

      for (const tag of mediaThumbnail) {
        const url = extractAttribute(tag, "url");

        if (url) {
          imageUrl = url;
          break;
        }
      }
    }

    if (!imageUrl) {
      const enclosure =
        block.match(/<enclosure\b[^>]*>/gi) || [];

      for (const tag of enclosure) {
        const type = extractAttribute(tag, "type");
        const url = extractAttribute(tag, "url");

        if (
          url &&
          (!type || type.startsWith("image/"))
        ) {
          imageUrl = url;
          break;
        }
      }
    }

    if (!imageUrl) {
      imageUrl = extractImage(description);
    }

    if (!imageUrl) {
      imageUrl = extractImage(content);
    }

    if (
      title &&
      link &&
      /^https?:\/\//i.test(link)
    ) {
      items.push({
        title,
        link: link.trim(),
        description: cleanText(description),
        content: cleanText(content),
        pubDate,
        imageUrl,
      });
    }
  }

  return items;
}

function classifyCategory(
  title: string,
  text: string
): Category {
  const value =
    `${title} ${text}`.toLowerCase();

  if (
    /\bbitcoin\b|\bethereum\b|\bcrypto\b|\bcryptocurrency\b|\bblockchain\b|\bcoinbase\b|\bbinance\b|\btoken\b/.test(
      value
    )
  ) {
    return "Crypto";
  }

  if (
    /\bfootball\b|\bsoccer\b|\bnba\b|\bnfl\b|\btennis\b|\bboxing\b|\bufc\b|\bformula 1\b|\bf1\b|\bsport\b|\bchampions league\b|\bpremier league\b/.test(
      value
    )
  ) {
    return "Sports";
  }

  if (
    /\biphone\b|\bandroid\b|\bgoogle\b|\bmicrosoft\b|\bapple\b|\bmeta\b|\bopenai\b|\bai\b|\bartificial intelligence\b|\btechnology\b|\btech\b|\bsoftware\b|\bcybersecurity\b/.test(
      value
    )
  ) {
    return "Technology";
  }

  if (
    /\bstock\b|\bshares\b|\binvestor\b|\binvestors\b|\bmarket\b|\bmarkets\b|\bbank\b|\bbanking\b|\beconomy\b|\beconomic\b|\bbusiness\b|\bcompany\b|\bcompanies\b|\bearnings\b|\bfinance\b/.test(
      value
    )
  ) {
    return "Business";
  }

  if (
    /\bcelebrity\b|\bactor\b|\bactress\b|\bsinger\b|\bmusic\b|\bmovie\b|\bfilm\b|\bhollywood\b|\bentertainment\b/.test(
      value
    )
  ) {
    return "Entertainment";
  }

  if (
    /\bgossip\b|\brelationship\b|\bbreakup\b|\bromance\b|\bdating\b|\bviral\b/.test(
      value
    )
  ) {
    return "Gossip";
  }

  if (
    /\bnigeria\b|\bnigerian\b|\blagos\b|\babuja\b|\brivers state\b|\bkano\b|\bplateau\b|\bdelta state\b|\bimo state\b|\benugu\b|\bondo\b|\boyo\b/.test(
      value
    )
  ) {
    return "Nigeria";
  }

  if (
    /\bpresident\b|\bgovernment\b|\belection\b|\bsenate\b|\bminister\b|\bpolitics\b|\bpolitical\b|\bcongress\b|\bparliament\b|\bparty\b|\bgovernor\b/.test(
      value
    )
  ) {
    return "Politics";
  }

  if (
    /\bwar\b|\bconflict\b|\binternational\b|\bworld\b|\bunited states\b|\buk\b|\bunited kingdom\b|\beurope\b|\bmiddle east\b|\bafrica\b|\basia\b/.test(
      value
    )
  ) {
    return "World";
  }

  return "News";
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

async function fetchExternalText(
  url: string,
  timeoutMs = FEED_FETCH_TIMEOUT_MS
): Promise<string> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "JNMuleeNewsBot/1.0 (+https://jnmulee-news-jnnation.vercel.app)",
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8",
      },
      cache: "no-store",
    });

    if (!response.ok) return "";

    return await response.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchArticlePage(
  url: string
): Promise<{
  text: string;
  imageUrl: string | null;
}> {
  const html = await fetchExternalText(
    url,
    ARTICLE_FETCH_TIMEOUT_MS
  );

  if (!html) {
    return {
      text: "",
      imageUrl: null,
    };
  }

  let imageUrl: string | null = null;

  const ogImage =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
    )?.[1] || null;

  if (ogImage) imageUrl = ogImage;

  if (!imageUrl) {
    const twitterImage =
      html.match(
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
      )?.[1] || null;

    if (twitterImage) imageUrl = twitterImage;
  }

  if (!imageUrl) {
    const jsonLdMatches =
      html.match(
        /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
      ) || [];

    for (const block of jsonLdMatches) {
      const jsonText = block
        .replace(/<script[^>]*>/i, "")
        .replace(/<\/script>$/i, "")
        .trim();

      try {
        const data = JSON.parse(jsonText);

        const candidates =
          Array.isArray(data) ? data : [data];

        for (const candidate of candidates) {
          const image = candidate?.image;

          if (typeof image === "string") {
            imageUrl = image;
            break;
          }

          if (
            image &&
            typeof image === "object" &&
            typeof image.url === "string"
          ) {
            imageUrl = image.url;
            break;
          }

          if (Array.isArray(image)) {
            const first = image.find(
              (item) => typeof item === "string"
            );

            if (first) {
              imageUrl = first;
              break;
            }
          }
        }

        if (imageUrl) break;
      } catch {
        // Ignore invalid JSON-LD.
      }
    }
  }

  const articleCandidates: string[] = [];

  const articleMatch =
    html.match(
      /<article\b[^>]*>([\s\S]*?)<\/article>/i
    );

  if (articleMatch?.[1]) {
    articleCandidates.push(articleMatch[1]);
  }

  const mainMatch =
    html.match(
      /<main\b[^>]*>([\s\S]*?)<\/main>/i
    );

  if (mainMatch?.[1]) {
    articleCandidates.push(mainMatch[1]);
  }

  const commonContainers = [
    /<div[^>]+class=["'][^"']*(?:article-body|article-content|post-content|entry-content|story-body|story-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+id=["'][^"']*(?:article-body|article-content|post-content|entry-content|story-body|story-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of commonContainers) {
    const match = html.match(pattern);

    if (match?.[1]) {
      articleCandidates.push(match[1]);
    }
  }

  const cleanedCandidates =
    articleCandidates
      .map((candidate) => cleanText(candidate))
      .filter(
        (candidate) =>
          wordCount(candidate) >= MIN_SOURCE_WORDS
      );

  let bestText =
    cleanedCandidates.sort(
      (a, b) =>
        wordCount(b) - wordCount(a)
    )[0] || "";

  if (!bestText) {
    const jsonLdMatches =
      html.match(
        /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
      ) || [];

    for (const block of jsonLdMatches) {
      const jsonText = block
        .replace(/<script[^>]*>/i, "")
        .replace(/<\/script>$/i, "")
        .trim();

      try {
        const data = JSON.parse(jsonText);

        const candidates =
          Array.isArray(data) ? data : [data];

        for (const candidate of candidates) {
          if (
            typeof candidate?.articleBody ===
            "string"
          ) {
            const candidateText =
              cleanText(candidate.articleBody);

            if (
              wordCount(candidateText) >
              wordCount(bestText)
            ) {
              bestText = candidateText;
            }
          }
        }
      } catch {
        // Ignore invalid JSON-LD.
      }
    }
  }

  return {
    text: bestText,
    imageUrl:
      imageUrl && isSafeUrl(imageUrl)
        ? imageUrl
        : null,
  };
}

function buildSourceMaterial(
  item: FeedItem,
  articlePageText: string,
  articlePageImage: string | null
): Material {
  const textParts = [
    articlePageText,
    item.content,
    item.description,
  ].filter(Boolean);

  let text = dedupeParagraphs(
    textParts.join("\n\n")
  );

  text = removeSourceBoilerplate(text);
  text = removeAdvertising(text);
  text = removeAuthorBiography(text);
  text = dedupeParagraphs(text);

  const imageUrl =
    articlePageImage ||
    item.imageUrl ||
    extractImage(item.content) ||
    extractImage(item.description);

  return {
    title: normalizeWhitespace(item.title),
    url: item.link,
    publishedAt: item.pubDate,
    imageUrl:
      imageUrl && isSafeUrl(imageUrl)
        ? imageUrl
        : null,
    text: normalizeWhitespace(text),
  };
}

function cleanFinalArticle(value: string): string {
  let text = value
    .replace(/^```(?:text|markdown)?/i, "")
    .replace(/```$/i, "")
    .trim();

  text = removeSourceBoilerplate(text);
  text = removeAdvertising(text);
  text = removeAuthorBiography(text);
  text = dedupeParagraphs(text);

  return normalizeWhitespace(text);
}

function textToHtml(value: string): string {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((p) => normalizeWhitespace(p))
    .filter(Boolean);

  return paragraphs
    .map((paragraph) => {
      if (/^#{2,4}\s+/.test(paragraph)) {
        const heading =
          paragraph.replace(/^#{2,4}\s+/, "");

        return `<h2>${escapeHtml(
          heading
        )}</h2>`;
      }

      return `<p>${escapeHtml(
        paragraph
      )}</p>`;
    })
    .join("\n");
}

function containsForbiddenContent(
  value: string
): boolean {
  const lower = value.toLowerCase();

  const forbidden = [
    "originally published by",
    "this story was originally published",
    "this story continues at",
    "read the original story",
    "read more on",
    "source:",
    "via:",
    "subscribe to our newsletter",
    "follow us on",
    "related stories",
    "related articles",
    "recommended stories",
    "most read",
    "latest news",
    "advertisement",
    "sponsored content",
    "written by:",
    "author bio",
  ];

  return forbidden.some((phrase) =>
    lower.includes(phrase)
  );
}

function qualityScore(value: string): number {
  const words = wordCount(value);

  if (words < 180) return 0;

  let score = 50;

  if (words >= 250) score += 10;
  if (words >= 400) score += 10;
  if (words >= 600) score += 5;

  const paragraphs = value
    .split(/\n{2,}/)
    .filter(Boolean);

  if (paragraphs.length >= 5) score += 10;
  if (paragraphs.length >= 8) score += 5;

  if (
    /\bsaid\b|\btold\b|\baccording to\b|\bannounced\b/i.test(
      value
    )
  ) {
    score += 5;
  }

  const repeated = paragraphs.filter(
    (p, index) =>
      paragraphs.indexOf(p) !== index
  ).length;

  score -= repeated * 10;

  return Math.max(
    0,
    Math.min(100, score)
  );
}

async function generateJnmuleeArticle(
  material: Material
): Promise<string | null> {
  if (!openai) return null;

  const prompt = `
SOURCE MATERIAL

Title:
${material.title}

Published date:
${material.publishedAt || "Not provided"}

Verified reporting material:
${material.text}

TASK

Create a completely original JNMulee News article from the verified reporting material above.

This is an editorial reconstruction, NOT a summary and NOT a sentence-by-sentence rewrite.

Write the article from scratch.

Reorganize the verified facts into a new structure.

Use fresh wording, fresh sentence construction, natural transitions and a coherent JNMulee News editorial flow.

Do not preserve the source article's paragraph order.

Do not copy distinctive phrases.

Do not simply replace words with synonyms.

Do not stitch source sentences together.

Do not mention the source publication.

Do not mention the source website.

Do not mention that this was imported, rewritten, syndicated or generated.

Do not include URLs.

Do not include source bylines.

Do not include author biographies.

Do not include advertisements or promotional material.

Do not include "Originally published by".

Do not include "Source:" or "Via:".

Do not claim that JNMulee News personally interviewed anyone or independently witnessed anything unless that is actually contained in the supplied material.

Use only facts supported by the supplied material.

Never invent facts, names, dates, locations, statistics, quotations, reactions, motives, background or events.

Preserve uncertainty where appropriate.

The opening should clearly explain the most important verified development.

Use readable paragraphs.

Use a professional news tone.

Avoid clickbait.

Avoid sensationalism.

Avoid filler.

Minimum length: 180 real words.

Prefer 500–900 words when enough verified material exists.

If the material genuinely does not contain enough verified information for a useful 180-word article, return exactly:

INSUFFICIENT_SOURCE_MATERIAL

Return ONLY the finished article.
`;

  try {
    const completion =
      await openai.chat.completions.create({
        model: AI_MODEL,
        temperature: 0.35,
        max_tokens: 2200,
        messages: [
          {
            role: "system",
            content: `
You are the senior news editor for JNMulee News.

Your job is to produce accurate, original, professionally edited news articles.

The output must be original JNMulee News wording and structure based only on verified supplied facts.

Never invent facts.

Never copy source paragraphs.

Never perform superficial synonym replacement.

Never mention the source publication inside the article.

Never mention AI.

Never mention these instructions.

Return only the article.
`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    const result =
      completion.choices[0]?.message?.content?.trim();

    if (!result) return null;

    if (
      result.trim().toUpperCase() ===
      "INSUFFICIENT_SOURCE_MATERIAL"
    ) {
      return null;
    }

    return cleanFinalArticle(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error
        ? Number(
            (error as { status?: number }).status
          )
        : undefined;

    if (
      status === 429 ||
      /credit_balance_exhausted|insufficient_quota|quota/i.test(
        message
      )
    ) {
      throw new Error(
        "OPENAI_CREDITS_UNAVAILABLE"
      );
    }

    console.error(
      "OpenAI article generation error:",
      error
    );

    return null;
  }
}

async function insertArticle(
  material: Material,
  category: Category,
  article: string,
  source: SourceRow
) {
  const title =
    normalizeWhitespace(material.title);

  const slugBase = slugify(title);

  let slug =
    slugBase ||
    `jnmulee-${Date.now()}`;

  const { data: existingSlug } =
    await supabase
      .from("news")
      .select("id")
      .eq("slug", slug)
      .limit(1);

  if (
    existingSlug &&
    existingSlug.length > 0
  ) {
    slug = `${slugBase}-${Date.now()}`;
  }

  const content = textToHtml(article);

  const payload = {
    title,
    slug,
    content,
    image_url: material.imageUrl,
    Published: true,
    source_url: material.url,
    category,
    content_type: "syndicated",
    source_name:
      source.name || "Unknown Source",
    canonical_url: material.url,
    attribution_text:
      "Published by JNMulee News",
  };

  const { error } =
    await supabase
      .from("news")
      .upsert(payload, {
        onConflict: "source_url",
        ignoreDuplicates: true,
      });

  return error;
}

export async function GET(
  request: Request
) {
  const startedAt = Date.now();

  const { searchParams } =
    new URL(request.url);

  const batchParam =
    searchParams.get("batch");

  const isManualBatch =
    batchParam !== null &&
    /^\d+$/.test(batchParam);

  let requestedBatch =
    isManualBatch
      ? Math.floor(Number(batchParam))
      : 0;

  if (
    !Number.isFinite(requestedBatch) ||
    requestedBatch < 0
  ) {
    requestedBatch = 0;
  }

  const stats = {
    sourcesProcessed: 0,
    feedItemsSeen: 0,
    articlesPublished: 0,
    articlesSkipped: 0,
    skippedNoImage: 0,
    skippedShortSource: 0,
    skippedDuplicate: 0,
    skippedPoorQuality: 0,
    articlePagesFetched: 0,
    aiGenerated: 0,
  };

  const errors: string[] = [];

  let aiCreditsUnavailable = false;

  try {
    const {
      data: sources,
      error: sourcesError,
    } = await supabase
      .from("sources")
      .select(
        "id,name,feed_url,active"
      )
      .eq("active", true)
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
     * SCHEDULED IMPORT
     *
     * The Supabase RPC performs the
     * timing check AND batch assignment
     * atomically.
     *
     * This prevents two simultaneous
     * Vercel cron requests from claiming
     * different batches at the same time.
     */
    if (!isManualBatch) {
      const {
        data: claimedBatch,
        error: claimError,
      } = await supabase.rpc(
        "claim_news_import_batch",
        {
          p_batch_count: totalBatches,
        }
      );

      if (claimError) {
        throw new Error(
          `Unable to claim importer batch: ${claimError.message}`
        );
      }

      const batch =
        Number(claimedBatch);

      /*
       * -1 means the 50-minute window
       * has not elapsed.
       */
      if (batch < 0) {
        return Response.json(
          {
            success: true,
            skipped: true,
            message:
              "Importer trigger received, but the 50-minute interval has not elapsed yet.",
            totalSources:
              allSources.length,
            totalBatches,
            durationMs:
              Date.now() - startedAt,
          },
          {
            status: 200,
            headers: {
              "Cache-Control":
                "no-store, max-age=0",
            },
          }
        );
      }

      requestedBatch = batch;
    }

    const batch =
      requestedBatch %
      totalBatches;

    const sourceStart =
      batch *
      MAX_SOURCES_PER_BATCH;

    const batchSources =
      allSources.slice(
        sourceStart,
        sourceStart +
          MAX_SOURCES_PER_BATCH
      );

    if (
      batchSources.length === 0
    ) {
      return Response.json(
        {
          success: true,
          message:
            `Batch ${batch} has no remaining sources.`,
          batch,
          totalSources:
            allSources.length,
          totalBatches,
          sourceStart,
          sourcesProcessed: 0,
          articlesPublished: 0,
          articlesSkipped: 0,
          durationMs:
            Date.now() - startedAt,
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        }
      );
    }

    for (const source of batchSources) {
      if (aiCreditsUnavailable) break;

      stats.sourcesProcessed++;

      if (
        !source.feed_url ||
        !isSafeUrl(source.feed_url)
      ) {
        errors.push(
          `${source.name || source.id}: invalid feed URL`
        );
        continue;
      }

      try {
        const feedXml =
          await fetchExternalText(
            source.feed_url,
            FEED_FETCH_TIMEOUT_MS
          );

        if (!feedXml) continue;

        const items =
          parseFeed(feedXml).slice(
            0,
            MAX_FEED_ITEMS_PER_SOURCE
          );

        stats.feedItemsSeen +=
          items.length;

        for (const item of items) {
          if (aiCreditsUnavailable) break;

          try {
            if (
              !item.link ||
              !isSafeUrl(item.link)
            ) {
              stats.articlesSkipped++;
              continue;
            }

            /*
             * Duplicate protection.
             */
            const {
              data: existing,
              error:
                duplicateError,
            } = await supabase
              .from("news")
              .select("id")
              .eq(
                "source_url",
                item.link
              )
              .limit(1);

            if (duplicateError) {
              errors.push(
                `${source.name || source.id}: duplicate check failed: ${duplicateError.message}`
              );

              stats.articlesSkipped++;
              continue;
            }

            if (
              existing &&
              existing.length > 0
            ) {
              stats.skippedDuplicate++;
              stats.articlesSkipped++;
              continue;
            }

            /*
             * Get full article page.
             */
            const articlePage =
              await fetchArticlePage(
                item.link
              );

            if (articlePage.text) {
              stats.articlePagesFetched++;
            }

            const material =
              buildSourceMaterial(
                item,
                articlePage.text,
                articlePage.imageUrl
              );

            /*
             * Every published article
             * must have an image.
             */
            if (
              !material.imageUrl ||
              !isSafeUrl(
                material.imageUrl
              )
            ) {
              stats.skippedNoImage++;
              stats.articlesSkipped++;
              continue;
            }

            /*
             * Reject thin source material.
             */
            if (
              wordCount(
                material.text
              ) < MIN_SOURCE_WORDS
            ) {
              stats.skippedShortSource++;
              stats.articlesSkipped++;
              continue;
            }

            const category =
              classifyCategory(
                material.title,
                material.text
              );

            /*
             * Generate original article.
             */
            const article =
              await generateJnmuleeArticle(
                material
              );

            if (!article) {
              stats.articlesSkipped++;
              continue;
            }

            stats.aiGenerated++;

            const finalWords =
              wordCount(article);

            if (
              finalWords <
              MIN_FINAL_WORDS
            ) {
              stats.skippedPoorQuality++;
              stats.articlesSkipped++;
              continue;
            }

            if (
              containsForbiddenContent(
                article
              )
            ) {
              stats.skippedPoorQuality++;
              stats.articlesSkipped++;
              continue;
            }

            const score =
              qualityScore(article);

            if (score < 70) {
              stats.skippedPoorQuality++;
              stats.articlesSkipped++;
              continue;
            }

            const insertError =
              await insertArticle(
                material,
                category,
                article,
                source
              );

            if (insertError) {
              if (
                insertError.code ===
                "23505"
              ) {
                stats.skippedDuplicate++;
                stats.articlesSkipped++;
                continue;
              }

              errors.push(
                `${source.name || source.id}: insert failed: ${insertError.message}`
              );

              stats.articlesSkipped++;
              continue;
            }

            stats.articlesPublished++;
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : String(error);

            stats.articlesSkipped++;

            if (
              message ===
              "OPENAI_CREDITS_UNAVAILABLE"
            ) {
              aiCreditsUnavailable =
                true;
              break;
            }

            errors.push(
              `${source.name || source.id}: article processing failed: ${message}`
            );
          }
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        errors.push(
          `${source.name || source.id}: source processing failed: ${message}`
        );
      }
    }

    return Response.json(
      {
        success: true,
        message:
          "JNMulee News batch completed. Articles were reconstructed in original JNMulee News wording and published only when they met the image and 180-word quality requirements.",
        batch,
        totalSources:
          allSources.length,
        totalBatches,
        sourceStart,
        batchSourcesProcessed:
          batchSources.length,
        aiCreditsUnavailable,
        ...stats,
        durationMs:
          Date.now() - startedAt,
        errors,
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
    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : String(error),
        ...stats,
        aiCreditsUnavailable,
        durationMs:
          Date.now() - startedAt,
        errors,
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