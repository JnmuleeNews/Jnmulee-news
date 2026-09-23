import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newsId = String(body?.newsId || "").trim();

    if (!newsId) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const { error } = await supabase.rpc("increment_news_view", {
      article_id: newsId,
    });

    if (error) {
      console.error("View counter error:", error);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("View API error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}