"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Source = {
  id: number;
  name: string;
  feed_url: string;
  category: string;
  active: boolean;
};

type DirectAd = {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  placement:
    | "home_top"
    | "home_between"
    | "home_bottom"
    | "article_top"
    | "article_middle"
    | "article_bottom";
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export default function AdminPage() {
  const router = useRouter();

  const [sources, setSources] = useState<Source[]>([]);
  const [ads, setAds] = useState<DirectAd[]>([]);

  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [category, setCategory] = useState("Top Stories");

  const [adTitle, setAdTitle] = useState("");
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adLinkUrl, setAdLinkUrl] = useState("");
  const [adPlacement, setAdPlacement] =
    useState<DirectAd["placement"]>("home_top");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adSaving, setAdSaving] = useState(false);

  async function loadDashboard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const { data: sourceData, error: sourceError } = await supabase
      .from("sources")
      .select("id,name,feed_url,category,active")
      .order("id", { ascending: false });

    if (sourceError) {
      alert(sourceError.message);
    }

    setSources(sourceData ?? []);

    const { data: adData, error: adError } = await supabase
      .from("direct_ads")
      .select(
        "id,title,image_url,link_url,placement,active,starts_at,ends_at"
      )
      .order("created_at", { ascending: false });

    if (adError) {
      alert(adError.message);
    }

    setAds((adData as DirectAd[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function addSource(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);

    const { error } = await supabase.from("sources").insert({
      name: name.trim(),
      feed_url: feedUrl.trim(),
      category,
      active: true,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setFeedUrl("");

    await loadDashboard();
  }

  async function addAd(e: React.FormEvent) {
    e.preventDefault();

    setAdSaving(true);

    const { error } = await supabase.from("direct_ads").insert({
      title: adTitle.trim(),
      image_url: adImageUrl.trim(),
      link_url: adLinkUrl.trim(),
      placement: adPlacement,
      active: true,
    });

    setAdSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setAdTitle("");
    setAdImageUrl("");
    setAdLinkUrl("");
    setAdPlacement("home_top");

    await loadDashboard();
  }

  async function toggleAd(id: string, active: boolean) {
    const { error } = await supabase
      .from("direct_ads")
      .update({
        active: !active,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadDashboard();
  }

  async function deleteAd(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this advert?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("direct_ads")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadDashboard();
  }

  async function deleteSource(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this source?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("sources")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadDashboard();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <main className="dashboardPage">
      <header className="dashboardHeader">
        <div className="container">
          <Link className="brand" href="/">
            JNMulee <span>News</span>
          </Link>

          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="container section">
        <h1>News Dashboard</h1>

        <div className="adminActions">
          <Link href="/admin/news/new">
            <button type="button">+ Create News</button>
          </Link>

          <Link href="/">
            <button type="button">View Website</button>
          </Link>
        </div>

        <h2>Personal Advertisers</h2>

        <p>
          Add adverts from businesses or personal advertisers. Once added,
          the advert will appear automatically in