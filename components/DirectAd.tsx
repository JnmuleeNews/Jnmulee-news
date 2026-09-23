import { createClient } from "@supabase/supabase-js";

type Placement =
  | "home_top"
  | "home_between"
  | "home_bottom"
  | "article"
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
  /*
   * All homepage ad positions use either:
   * - homepage
   * - homepage_ads
   *
   * Ads Page uses:
   * - ads_page
   * - homepage_ads
   */

  const isHomepage =
    placement === "home_top" ||
    placement === "home_between" ||
    placement === "home_bottom";

  const placements = isHomepage
    ? ["homepage", "homepage_ads"]
    : ["ads_page", "homepage_ads"];

  const { data: ads } = await supabase
    .from("direct_ads")
    .select("id, title, image_url, link_url, placement")
    .in("placement", placements)
    .eq("active", true)
    .or("starts_at.is.null,starts_at.lte.now()")
    .or("ends_at.is.null,ends_at.gte.now()")
    .order("created_at", { ascending: false })
    .limit(1);

  const ad = ads?.[0];

  if (!ad) {
    return null;
  }

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