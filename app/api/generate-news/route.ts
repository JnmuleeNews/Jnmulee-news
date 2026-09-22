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
You are the senior editor for JNMulee News.

Create an original news report based ONLY on the supplied information.

Rules:
- Do not copy the source word-for-word.
- Do not invent facts, quotes, names, numbers, or events.
- Keep all important facts accurate.
- Create a clear factual headline.
- Write approximately 400-600 words.
- Use short paragraphs.
- Do not mention AI.
- At the end, include the original source link.

CATEGORY:
${article.category}

HEADLINE:
${article.title}

SOURCE INFORMATION:
${article.content}

ORIGINAL SOURCE:
${article.source_url}
`;

      const response = await openai.responses.create({
        model: "gpt-5.6-luna",
        input: prompt,
      });

      const generatedText = response.output_text?.trim();

      if (!generatedText) {
        continue;
      }

      const { error: updateError } = await supabase
        .from("news")
        .update({
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