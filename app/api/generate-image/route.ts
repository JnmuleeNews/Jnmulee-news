import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: article, error } = await supabase
      .from("news")
      .select("id,title,content")
      .eq("Published", false)
      .is("image_url", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!article) {
      return NextResponse.json({
        success: true,
        message: "No article needs an image",
      });
    }

    const prompt = `
Create a professional, realistic editorial news photograph
for this news story.

Headline:
${article.title}

Story:
${article.content}

Requirements:
- Photorealistic editorial/news photography
- Appropriate to the actual story
- No text, captions, logos, watermarks, or fake news graphics
- Do not create a recognizable real person unless the story specifically requires it
`;

    const result = await openai.images.generate({
      model: "gpt-image-2",
      prompt,
      size: "1536x1024",
      quality: "medium",
      output_format: "webp",
    });

    const base64 = result.data?.[0]?.b64_json;

    if (!base64) {
      return NextResponse.json(
        { error: "No image was generated" },
        { status: 500 }
      );
    }

    const imageBuffer = Buffer.from(base64, "base64");

    const fileName = `news-${article.id}-${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("news-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: publicUrl } = supabase.storage
      .from("news-images")
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("news")
      .update({
        image_url: publicUrl.publicUrl,
      })
      .eq("id", article.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image_url: publicUrl.publicUrl,
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