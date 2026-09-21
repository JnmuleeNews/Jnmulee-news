import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

function stripHtml(text: string) {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/<!CDATA\[|\]>/g, "")
    .trim();
}

function makeSlug(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") +
    "-" +
    Date.now()
  );
}

export async function GET() {
  try {
    const { data: sources, error: sourceError } = await supabase
      .from("sources")
      .select("id,name,feed_url,category,active")
      .eq("active", true);

    if (sourceError) {
      return NextResponse.json(
        { error: sourceError.message },
        { status: 500 }
      );
    }

    let added = 0;

    for (const source of sources ?? []) {
      const response = await fetch(source.feed_url, {
        headers: {
          "User-Agent": "JNMulee-News/1.0",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        continue;
      }

      const xml = await response.text();

      const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)];

      for (const match of items.slice(0, 10)) {
        const item = match[0];

        const titleMatch = item.match(
          /<title[^>]*>([\s\S]*?)<\/title>/i
        );

        const linkMatch = item.match(
          /<link[^>]*>([\s\S]*?)<\/link>/i
        );

        const descriptionMatch = item.match(
          /<description[^>]*>([\s\S]*?)<\/description>/i
        );

        if (!titleMatch || !linkMatch) {
          continue;
        }

        const title = strip