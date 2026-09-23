import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DirectAd from "@/components/DirectAd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "JNMulee News | Latest News, Nigeria and World News",
  description:
    "JNMulee News brings you the latest Nigeria, world, business, technology, sports, entertainment, politics and crypto news.",
  alternates: {
    canonical:
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://jnmulee-news.vercel.app",
  },
  openGraph: {
    title:
      "JNMulee News | Latest News, Nigeria and World News",
    description:
      "Latest Nigeria, world, business, technology, sports, entertainment, politics and crypto news.",
    url:
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://jnmulee-news.vercel.app",
    siteName: "JNMulee News",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JNMulee News",
    description:
      "Latest news from Nigeria and around the world.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news.vercel.app";

const categories = [
  { name: "Top Stories", slug: "news" },
  { name: "Nigeria", slug: "nigeria" },
  { name: "World", slug: "world" },
  { name: "Business", slug: "business" },
  { name: "Technology", slug: "technology" },
  { name: "Sports", slug: "sports" },
  { name: "Entertainment", slug: "entertainment" },
  { name: "Gossip", slug: "gossip" },
  { name: "Politics", slug: "politics" },
  { name: "Crypto", slug: "crypto" },
];

type Story = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  image_url: string | null;
  category: string | null;
  created_at: string | null;
  view_count?: number | null;
};

function getExcerpt(
  content: string | null,
  length = 130
) {
  if (!content) return "";

  const text = content