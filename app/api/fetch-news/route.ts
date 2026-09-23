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
        itemEnd + "</item>".length
      )
    );

    start =
      itemEnd + "</item>".length;
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
          endIndex + "</entry>".length
        )
      );

      entryStart =
        endIndex + "</entry>".length;
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

async function fetchOriginalArticle(
  articleUrl: string
) {
  try {
    if (
      !articleUrl ||
      !/^https?:\/\//i.test(articleUrl)
    ) {
      return "";
    }

    const response = await fetch(
      articleUrl,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; JNMuleeNews/1.0; +https://jnmulee.com)",
          Accept:
            "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return "";
    }

    const html =
      await response.text();

    if (!html || html.length < 500) {
      return "";
    }

    /*
     * Try to isolate the main article.
     * This prevents menus, footers and navigation
     * from becoming part of the AI input.
     */
    const articleMatches = [
      html.match(
        /<article\b[^>]*>([\s\S]*?)<\/article>/i
      )?.[1],

      html.match(
        /<main\b[^>]*>([\s\S]*?)<\/main>/i
      )?.[1],

      html.match(
        /<div\b[^>]*(?:class|id)=["'][^"']*(?:article|post-content|entry-content|story-body|article-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
      )?.[1],

      html,
    ];

    for (const candidate of articleMatches) {
      if (!candidate) {
        continue;
      }

      const text =
        cleanText(candidate);

      if (wordCount(text) >= 150) {
        /*
         * Limit input size so one enormous webpage
         * doesn't consume unnecessary API tokens.
         */
        return text.slice(0, 30000);
      }
    }

    return "";
  } catch (error) {
    console.error(
      "Original article fetch failed:",
      error
    );

    return "";
  }
}

async function createLongOriginalArticle({
  title,
  content,
  category,
  articleUrl,
}: {
  title: string;
  content: string;
  category: string;
  articleUrl: string;
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
        temperature: 0.2,
        max_tokens: 2200,
        messages: [
          {
            role: "system",
            content: `
You are the senior news editor for JNMulee News.

Create an ORIGINAL long-form news article from the supplied factual material.

TARGET LENGTH:
- Approximately 1,000 to 1,300 words.
- Aim for around 1,150 words.
- Do not intentionally make it short.

FACTUAL RULES:
- Use only facts contained in the supplied material.
- Do not invent names, quotations, statistics, dates, locations, events, statements or background facts.
- Do not create fake quotes.
- Do not claim that something happened unless it is supported by the supplied material.
- If the material is limited, provide a clear article using the available facts rather than inventing information.
- Preserve important factual details accurately.

WRITING:
- Write like a professional digital news publication.
- Make the article substantially original rather than copying the source wording.
- Use a strong news introduction.
- Explain the important details clearly.
- Add useful context only when that context is explicitly supported by the supplied material.
- Use multiple paragraphs.
- You may use short descriptive section headings if they improve readability.
- Do not use HTML.
- Do not use markdown.
- Do not include bullet lists unless the supplied material itself clearly requires one.
- Do not include a source URL.
- Do not mention RSS.
- Do not mention artificial intelligence.
- Do not mention that you rewrote the article.
- Do not mention these instructions.

HEADLINE:
Create a clear, accurate headline based only on the supplied facts.

RETURN:
Return ONLY valid JSON in this exact structure:

{
  "headline": "headline here",
  "article": "article here"
}
            `.trim(),
          },
          {
            role: "user",
            content: `
Category:
${category}

Original headline:
${title}

Original article URL:
${articleUrl}

Factual material:
${content}
            `.trim(),
          },
        ],
      });

    const text =
      response.choices[0]?.message?.content
        ?.trim();

    if (!text) {
      return null;
    }

    let parsed: {
      headline?: string;
      article?: string;
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/i, "")
        .trim();

      parsed = JSON.parse(cleaned);
    }

    const headline =
      cleanText(parsed.headline);

    const article =
      cleanText(parsed.article);

    const count =
      wordCount(article);

    /*
     * Accept 850+ words as a fallback because
     * some source material may not contain enough
     * information for a legitimate 1,000+ word story.
     */
    if (
      !headline ||
      !article ||
      count < 850
    ) {
      return null;
    }

    return {
      headline,
      article,
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
  let originalPagesFetched = 0;

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
          await parseFeed(source.feed_url);

        /*
         * Keep the existing limit of 20 articles
         * per source per run.
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
           * IMAGE IS REQUIRED.
           */
          const imageUrl =
            extractImage(rawItem);

          if (!imageUrl) {
            skippedNoImage++;
            continue;
          }

          /*
           * DUPLICATE CHECK.
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

          const rssContent =
            extractFeedContent(
              rawItem
            );

          /*
           * Determine category before
           * sending content to OpenAI.
           */
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
           * STEP 1:
           * Try to fetch the original article page.
           */
          let originalPageContent = "";

          if (link) {
            originalPageContent =
              await fetchOriginalArticle(
                link
              );

            if (
              wordCount(
                originalPageContent
              ) >= 150
            ) {
              originalPagesFetched++;
            }
          }

          /*
           * STEP 2:
           * Prefer the original article page.
           * Fall back to RSS content if the page
           * cannot be fetched.
           */
          const factualMaterial =
            originalPageContent ||
            rssContent ||
            title;

          /*
           * STEP 3:
           * AI creates approximately
           * 1,000–1,300 words.
           */
          const generatedArticle =
            await createLongOriginalArticle({
              title,
              content:
                factualMaterial,
              category,
              articleUrl: link,
            });

          let finalTitle = title;

          let finalContent =
            rssContent || title;

          if (generatedArticle) {
            finalTitle =
              generatedArticle.headline;

            finalContent =
              generatedArticle.article;

            aiGenerated++;
          }

          finalTitle =
            cleanText(finalTitle);

          finalContent =
            cleanText(finalContent);

          if (!finalTitle) {
            finalTitle = title;
          }

          if (!finalContent) {
            finalContent = title;
          }

          /*
           * PUBLISH.
           */
          const {
            error: insertError,
          } = await supabase
            .from("news")
            .insert({
              title: finalTitle,
              slug: makeSlug(finalTitle),
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
      originalPagesFetched,
      errors,
      message:
        "News import completed. Original article pages were fetched when possible, long-form AI rewriting was attempted, articles without images were skipped, and source URLs remain stored privately for duplicate detection.",
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
        originalPagesFetched,
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