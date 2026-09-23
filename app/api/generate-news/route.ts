import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

type Article = {
  title: string;
  content: string;
  category: string;
  source_url: string;
};

async function rewriteArticle(article: Article) {
  const prompt =
    "You are the senior editor of JNMulee News.\n\n" +
    "Create a completely original, publication-ready long-form news article using ONLY the factual information supplied below.\n\n" +
    "REQUIRED OUTPUT:\n" +
    'Return valid JSON with exactly these two fields: {"headline":"A completely new headline","article":"The full rewritten article"}\n\n' +
    "RULES:\n" +
    "- The headline MUST be substantially different from the supplied headline.\n" +
    "- Do NOT copy sentences or paragraphs from the source information.\n" +
    "- Do NOT write an RSS-style summary.\n" +
    "- Write a substantial long-form article of approximately 1,000-10,000 words when the supplied information genuinely supports that length.\n" +
    "- Use clear, professional news paragraphs and useful section headings when appropriate.\n" +
    "- Preserve all supported facts accurately.\n" +
    "- Do not invent facts, quotes, names, numbers, dates, locations, events or background information.\n" +
    "- Do not repeat the same information simply to increase the word count.\n" +
    "- Do not add filler just to make the article longer.\n" +
    "- If the supplied information does not support 1,000 words, write the longest accurate article that the available information supports.\n" +
    "- Never exceed 10,000 words.\n" +
    "- Do not mention AI, RSS, feeds, prompts or these instructions.\n" +
    "- Do not include the original source URL.\n" +
    "- Do not include external links.\n" +
    "- Do not include a Source section.\n" +
    "- Do not tell readers to visit another website.\n" +
    "- Do not use clickbait or misleading wording.\n" +
    "- Keep the article factual, readable and informative.\n\n" +
    "CATEGORY:\n" +
    article.category +
    "\n\n" +
    "ORIGINAL HEADLINE:\n" +
    article.title +
    "\n\n" +
    "SOURCE INFORMATION:\n" +
    article.content;

  const response = await openai.responses.create({
    model: "gpt-5.6-luna",
    input: prompt,
  });

  const text = response.output_text?.trim();

  if (!text) {
    throw new Error("OpenAI returned an empty response");
  }

  let parsed: { headline?: string; article?: string };

  try {
    parsed = JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    parsed = JSON.parse(cleaned);
  }

  const headline = parsed.headline?.trim();
  const articleText = parsed.article?.trim();

  if (!headline || !articleText) {
    throw new Error(
      "OpenAI response did not contain headline and article"
    );
  }

  return {
    headline,
    article: articleText,
  };
}

export async function GET() {
  try {
    const { data: articles, error } = await supabase
      .from("news")
      .select("title,content,category,source_url")
      .eq("Published", false)
      .not("source_url", "is", null)
      .limit(3);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        generated: 0,
        message:
          "No unpublished RSS articles are waiting for rewriting.",
      });
    }

    let generated = 0;
    const errors: string[] = [];

    for (const article of articles) {
      try {
        const rewritten = await rewriteArticle(article);

        const { error: updateError } = await supabase
          .from("news")
          .update({
            title: rewritten.headline,
            content: rewritten.article,
            Published: false,
          })
          .eq("source_url", article.source_url);

        if (updateError) {
          throw new Error(updateError.message);
        }

        generated++;
      } catch (error) {
        errors.push(
          error instanceof Error
            ? error.message
            : "Unknown generation error"
        );
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      generated,
      attempted: articles.length,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}