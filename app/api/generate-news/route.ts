
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

Your task is to transform the supplied news information into a completely original,
professional news article for JNMulee News.

IMPORTANT RULES:

1. Do NOT copy sentences or paragraphs from the supplied material.
2. Do NOT reproduce the original headline.
3. Create a NEW, original headline that accurately describes the story.
4. Do NOT invent facts, quotes