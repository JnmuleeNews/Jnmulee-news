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
    // Get unpublished news that came from the RSS feed
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
You are the senior editor for JNMulee News.

Create an ORIGINAL news article based only on the information supplied below.

Rules:
- Do not copy the source article word-for-word.
- Do not invent facts, quotes, numbers, names, or events.
- Rewrite the information clearly in professional news style.
- Create a strong but factual headline.
- Write approximately 400-600 words.
- Include a short introduction.
- Use short paragraphs.
- Keep important facts from the source.
- Do not say that you are AI.
- At the end, include a short "Source" line with the original source name/link.

SOURCE CATEGORY:
${article.category}

HEADLINE:
${article.title}

SOURCE INFORMATION:
${article.content}

ORIGINAL SOURCE:
${article.source_url}
`;

      const response = await openai.responses.create({
        model: "gpt-5.6-mini",
        input: prompt,
      });

      const generatedText = response.output_text?.trim();

      if (!generatedText) {
        continue;
      }

      const newTitle =
        generatedText
          .split("\n")
          .find((line) => line.trim().length > 10)
          ?.replace(/^#+\s*/, "")
          .trim() || article.title;

      const slug =
        newTitle
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-") +
        "-" +
        Date.now();

      const { error: updateError } = await supabase
        .from("news")
        .update({
          title: newTitle,
          slug,
          content: generatedText,
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