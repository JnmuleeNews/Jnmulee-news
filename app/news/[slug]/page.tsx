import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Props = {
  params: Promise<{ slug: string }>;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function cleanText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getImageFromContent(value: string) {
  const match = value.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

export default async function Article({ params }: Props) {
  const { slug } = await params;

  const { data: story, error } = await supabase
    .from("news")
    .select(
      "id, title, slug, content, image_url, category, source_url, created_at"
    )
    .eq("slug", slug)
    .eq("Published", true)
    .maybeSingle();

  if (error || !story) {
    notFound();
  }

  const rawContent = story.content || "";

  const imageUrl =
    story.image_url || getImageFromContent(rawContent);

  const cleanContent = cleanText(rawContent);

  return (
    <main>
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            JNMulee <span>News</span>
          </a>

          <a href="/">⌂ Home</a>
        </div>
      </header>

      <article className="container article">
        <p className="category">
          {story.category || "News"}
        </p>

        <h1>{story.title}</h1>

        <p className="meta">
          Published by JNMulee News
        </p>

        {imageUrl ? (
          <img
            src={imageUrl}
            alt={story.title}
            style={{
              width: "100%",
              maxHeight: 520,
              objectFit: "cover",
              borderRadius: 16,
              margin: "20px 0 28px",
            }}
          />
        ) : null}

        <div className="articleBody">
          <p>
            {cleanContent ||
              "Read the latest story from JNMulee News."}
          </p>

          {story.source_url ? (
            <p style={{ marginTop: 24 }}>
              <a
                href={story.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the original source →
              </a>
            </p>
          ) : null}
        </div>
      </article>
    </main>
  );
}