import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function GET() {
  try {
    const { data: articles, error } = await supabase
      .from("news")
      .select("title,content,category,source_url")
      .eq("Published", false)
      .not("source_url", "is", null)
      .limit(5);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    let generated = 0;

    for (const article of articles ?? []) {
      const prompt = `
You are the senior editor of JNMulee News.

Transform the supplied news information into a completely original,
professional news article.

RULES:

- Create a completely NEW headline.
- Do NOT reproduce the original headline.
- Do NOT copy sentences or paragraphs.
- Do NOT write an RSS-style short summary.
- Write approximately 500-700 words when enough information is available.
- Use clear paragraphs.
- Keep every factual detail accurate.
- Do not invent facts, names, quotes, numbers, dates or events.
- Do not mention AI, RSS, feeds or these instructions.
- Do not include the original source URL.
- Do not include external links.
- Do not include a Source section.
- Do not tell readers to visit another website.
- Do not use clickbait.
- Return ONLY the new headline followed by the article.

CATEGORY:
${article.category}

ORIGINAL HEADLINE:
${article.title}

SOURCE INFORMATION:
${article.content}
`;

      const response = await openai.responses.create({
        model: "gpt-5.6-luna",
        input: prompt,
      });

      const generatedText = response.output_text?.trim();

      if (!generatedText) {
        continue;
      }

      const lines = generatedText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        continue;
      }

      const newTitle = lines[0]
        .replace(/^#+\s*/, "")
        .replace(/^["']|["']$/g, "")
        .trim();

      const newContent = lines
        .slice(1)
        .join("\n\n")
        .trim();

      if (!newTitle || !newContent) {
        continue;
      }

      const { error: updateError } = await supabase
        .from("news")
        .update({
          title: newTitle,
          content: newContent,
          Published: false,
        })
        .eq("source_url", article.source_url);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      generated++;
    }

    return NextResponse.json({
      success: true,
      generated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}