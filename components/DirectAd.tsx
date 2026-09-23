import { createClient } from "@supabase/supabase-js";

type Props = {
  slot?: string;
  placement?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function DirectAd({
  slot,
  placement: placementProp,
}: Props) {
  let placement = placementProp || "";

  if (!placement && slot) {
    if (
      slot === "home_top" ||
      slot === "home_between" ||
      slot === "home_bottom"
    ) {
      placement = "homepage";
    } else if (
      slot === "article_top" ||
      slot === "article_between" ||
      slot === "article_bottom"
    ) {
      placement = "article";
    } else if (slot === "ads_page") {
      placement = "ads_page";
    } else {
      placement = "homepage_ads";
    }
  }

  if (placement === "article_middle") {
    placement = "article";
  }

  const { data: ads } = await supabase
    .from("direct_ads")
    .select("id,title,image_url,link_url")
    .eq("active", true)
    .eq("placement", placement)
    .order("created_at", { ascending: false })
    .limit(1);

  const ad = ads?.[0];

  if (!ad || !ad.image_url) {
    return null;
  }

  return (
    <div
      className={`directAd ${
        slot ? `directAd-${slot}` : ""
      }`}
    >
      <a
        href={ad.link_url || "#"}
        target={ad.link_url ? "_blank" : undefined}
        rel={
          ad.link_url
            ? "noopener noreferrer sponsored"
            : undefined
        }
      >
        <img
          src={ad.image_url}
          alt={ad.title || "Advertisement"}
        />
      </a>
    </div>
  );
}