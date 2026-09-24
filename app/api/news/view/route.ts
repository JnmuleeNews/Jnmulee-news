import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const newsId = String(body?.newsId || "").trim();

    if (!UUID_RE.test(newsId)) {
      return NextResponse.json(
        { success: false },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const { data: article, error: articleError } = await supabase
      .from("news")
      .select("id")
      .eq("id", newsId)
      .eq("Published", true)
      .maybeSingle();

    if (articleError) {
      console.error("View article lookup error:", articleError);

      return NextResponse.json(
        { success: false },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (!article) {
      return NextResponse.json(
        { success: false },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const { error } = await supabase.rpc("increment_news_view", {
      article_id: newsId,
    });

    if (error) {
      console.error("View counter error:", error);

      return NextResponse.json(
        { success: false },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("View API error:", error);

    return NextResponse.json(
      { success: false },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}