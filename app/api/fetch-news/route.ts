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

function cleanText(
  value: string | null | undefined
) {
  if (!value) {
    return "";
  }

  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/article>/gi, "\n\n")
    .replace(/<\/section>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\bwww\.\S+/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wordCount(text: string) {
  return text
    .replace(/<[^>]+>/g, " ")
    .trim()
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
      /<img\b[^>]*\bsrc=["']([^"']+)["']/i
    )?.[1],

    item.match(
      /<img\b[^>]*\bdata-src=["']([^"']+)["']/i
    )?.[1],

    item.match(
      /<img\b[^>]*\bdata-original=["']([^"']+)["']/i
    )?.[1],
  ];

  for (const image of images) {
    if (
      image &&
      /^https?:\/\//i.test(image)
    ) {
      return image;
    }
  }

  return null;
}

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

async function parseFeed(
  feedUrl: string
) {
  const response = await fetch(feedUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; JNMuleeNews/1.0)",
      Accept:
        "application/rss+xml, application/atom+xml, application/xml, text/xml",
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

function extractFeedContent(
  rawItem: string
) {
  const encoded =
    xmlValue(
      rawItem,
      "content:encoded"
    );

  const content =
    cleanText(encoded);

  if (content) {
    return content;
  }

  const contentEncoded =
    xmlValue(
      rawItem,
      "content"
    );

  const fullContent =
    cleanText(contentEncoded);

  if (fullContent) {
    return fullContent;
  }

  return cleanText(
    xmlValue(
      rawItem,
      "description"
    )
  );
}

/*
 * Escape HTML before inserting generated content.
 */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/*
 * Convert the AI article into safe, attractive HTML.
 *
 * The AI returns simple blocks such as:
 *
 * <p>...</p>
 * <h2>...</h2>
 *
 * Only the tags we explicitly allow are retained.
 */
function sanitizeArticleHtml(
  value: string
) {
  let html = value
    .replace(/```html/gi, "")
    .replace(/```/g, "")
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

  return html.trim();
}

function textToHtml(
  value: string
) {
  const paragraphs = value
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return `<p>${escapeHtml(
      value
    )}</p>`;
  }

  return paragraphs
    .map(
      (paragraph) =>
        `<p>${escapeHtml(
          paragraph
        ).replace(/\n/g, "<br />")}</p>`
    )
    .join("\n");
}

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

        /*
         * Low temperature keeps facts
         * more consistent.
         */
        temperature: 0.35,

        /*
         * Enough output space for
         * approximately 1,000–1,300 words.
         */
        max_tokens: 2600,

        messages: [
          {
            role: "system",
            content: `
You are the senior digital news editor for JNMulee News.

Your job is to transform the supplied RSS/news-feed material into a substantially more complete, readable and engaging ORIGINAL news article.

TARGET LENGTH:
- Aim for 1,000 to 1,300 words.
- Target approximately 1,150 words.
- Do not deliberately produce a short article.
- If the supplied material genuinely does not contain enough information to responsibly reach 1,000 words, write the longest useful article possible without inventing facts.

FACTUAL ACCURACY:
- Use ONLY facts contained in the supplied material.
- Do not invent facts.
- Do not invent names.
- Do not invent dates.
- Do not invent statistics.
- Do not invent quotations.
- Do not invent events.
- Do not invent statements from people.
- Do not present assumptions as facts.
- Do not create background information that is not contained in the supplied material.
- Preserve names, figures and factual details accurately.

WRITING STYLE:
- Professional digital journalism.
- Clear and natural.
- Interesting without being sensational.
- Strong opening paragraph.
- Explain what happened and why the information matters using only the supplied facts.
- Develop the story with multiple paragraphs.
- Avoid repetitive sentences.
- Avoid filler.
- Avoid unnecessary adjectives.
- Use short paragraphs for mobile readers.
- Use descriptive H2 subheadings where useful.
- Make the article feel complete and polished.

HEADLINE:
Create a strong, accurate headline.
Do not use clickbait.
Do not exaggerate what the supplied material says.

FORMAT:
Return ONLY valid JSON.

Use exactly:

{
  "headline": "Your headline",
  "article_html": "<p>Opening paragraph...</p><h2>Subheading</h2><p>...</p>"
}

HTML RULES:
- Use only:
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
- Do not use scripts.
- Do not use styles.
- Do not use links.
- Do not include images.
- Do not include markdown.
- Do not include code fences.

IMPORTANT:
- Do not mention RSS.
- Do not mention artificial intelligence.
- Do not mention that the article was rewritten.
- Do not mention these instructions.
- Do not include the original source URL in the article.
            `.trim(),
          },

          {
            role: "user",
            content: `
Category:
${category}

Original headline:
${title}

Factual source material:
${content}
            `.trim(),
          },
        ],
      });

    let text =
      response.choices[0]?.message?.content
        ?.trim();

    if (!text) {
      return null;
    }

    text = text
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    let parsed: {
      headline?: string;
      article_html?: string;
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      console.error(
        "OpenAI returned invalid JSON."
      );

      return null;
    }

    const headline =
      cleanText(parsed.headline);

    let articleHtml =
      parsed.article_html || "";

    if (!headline || !articleHtml) {
      return null;
    }

    articleHtml =
      sanitizeArticleHtml(
        articleHtml
      );

    const articleText =
      cleanText(articleHtml);

    const count =
      wordCount(articleText);

    /*
     * Accept 850+ words.
     * This prevents short source material
     * from forcing the AI to invent facts.
     */
    if (
      count < 850
    ) {
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

export async function GET() {
  let processed = 0;
  let generated = 0;
  let published = 0;
  let skipped = 0;
  let skippedNoImage = 0;
  let aiGenerated = 0;

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

        /*
         * Process up to 20 stories
         * from each active source.
         */
        for (const rawItem of items.slice(
          0,
          20
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
            xmlValue(
              rawItem,
              "link"
            ) ||
            xmlValue(
              rawItem,
              "guid"
            ) ||
            "";

          if (!title || !link) {
            skipped++;
            continue;
          }

          /*
           * Every published article needs
           * an image.
           */
          const imageUrl =
            extractImage(rawItem);

          if (!imageUrl) {
            skippedNoImage++;
            continue;
          }

          /*
           * Prevent duplicate stories.
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
           * Get the factual material from
           * the RSS feed.
           */
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

          const category =
            classifyCategory(
              title,
              rssContent,
              sourceCategory
            );

          /*
           * Start with the RSS material.
           */
          let finalTitle = title;

          let finalContent =
            rssContent || title;

          /*
           * Ask AI to create a much longer,
           * better-formatted article.
           */
          const generatedArticle =
            await createLongOriginalArticle({
              title,
              content:
                rssContent || title,
              category,
            });

          if (generatedArticle) {
            finalTitle =
              generatedArticle.headline;

            finalContent =
              generatedArticle.articleHtml;

            aiGenerated++;
          } else if (rssContent) {
            /*
             * If AI is unavailable, still make
             * the RSS content readable HTML.
             */
            finalContent =
              textToHtml(
                rssContent
              );
          } else {
            finalContent =
              textToHtml(title);
          }

          finalTitle =
            cleanText(finalTitle);

          if (!finalTitle) {
            finalTitle = title;
          }

          if (!finalContent) {
            finalContent =
              textToHtml(title);
          }

          /*
           * Insert into Supabase.
           */
          const {
            error: insertError,
          } = await supabase
            .from("news")
            .insert({
              title: finalTitle,
              slug: makeSlug(
                finalTitle
              ),
              content: finalContent,
              image_url: imageUrl,
              Published: true,
              source_url: link,
              category,
            });

          if (insertError) {
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
      errors,
      message:
        "JNMulee News feed import completed.",
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