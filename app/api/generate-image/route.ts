import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: articles, error } = await supabase
      .from("news")
      .select("id,title,content,image_url")
      .eq("Published", false)
      .order("created_at", { ascending: true })
      .limit(3);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        generated: 0,
        published: 0,
        message: "No unpublished articles waiting for processing",
      });
    }

    let generated = 0;
    let published = 0;
    let skipped = 0;

    const errors: string[] = [];

    for (const article of articles) {
      try {
        let imageUrl = article.image_url;

        /*
         * If the RSS feed already provided an image,
         * use that image.
         */
        if (!imageUrl || imageUrl.trim() === "") {
          const prompt = `
Create a professional, realistic editorial news photograph
for this news story.

Headline:
${article.title}

Story:
${article.content || ""}

Requirements:
- Photorealistic editorial/news photography
- Appropriate to the actual story
- No text
- No captions
- No logos
- No watermarks
- No fake news graphics
- Do not create a recognizable real person unless the story specifically requires it
- The image must visually represent the actual subject of the story
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
            throw new Error("No image was generated");
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
            throw new Error(uploadError.message);
          }

          const { data: publicUrl } = supabase.storage
            .from("news-images")
            .getPublicUrl(fileName);

          if (!publicUrl?.publicUrl) {
            throw new Error("Could not create public image URL");
          }

          imageUrl = publicUrl.publicUrl;

          const { error: imageUpdateError } = await supabase
            .from("news")
            .update({
              image_url: imageUrl,
            })
            .eq("id", article.id);

          if (imageUpdateError) {
            throw new Error(imageUpdateError.message);
          }

          generated++;
        }

        /*
         * IMPORTANT:
         * Never publish an article without an image.
         */
        if (!imageUrl || imageUrl.trim() === "") {
          skipped++;
          continue;
        }

        const { error: publishError } = await supabase
          .from("news")
          .update({
            image_url: imageUrl,
            Published: true,
          })
          .eq("id", article.id)
          .eq("Published", false);

        if (publishError) {
          throw new Error(publishError.message);
        }

        published++;
      } catch (error) {
        errors.push(
          `${article.title}: ${
            error instanceof Error
              ? error.message
              : "Unknown image generation error"
          }`
        );
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      processed: articles.length,
      generated,
      published,
      skipped,
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