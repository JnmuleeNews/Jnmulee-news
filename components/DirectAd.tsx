import { createClient } from "@supabase/supabase-js";

type Placement =
  | "home_top"
  | "home_between"
  | "home_bottom"
  | "article_top"
  | "article_middle"
  | "article_bottom";

type Props = {
  placement: Placement;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function DirectAd({ placement }: Props) {
  const { data: ad } = await supabase
    .from("direct_ads")
    .select("id, title, image_url, link_url")
    .eq("placement", placement)
    .eq("active", true)
    .or("starts_at.is.null,starts_at.lte.now()")
    .or("ends_at.is.null,ends_at.gte.now()")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ad) return null;

  return (
    <div
      style={{
        margin: "28px 0",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: 11,
          opacity: 0.6,
          marginBottom: 8,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Advertisement
      </p>

      <a
        href={ad.link_url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={ad.title}
      >
        <img
          src={ad.image_url}
          alt={ad.title}
          style={{
            display: "block",
            width: "100%",
            maxHeight: 280,
            objectFit: "cover",
            borderRadius: 12,
          }}
        />
      </a>
    </div>
  );
}