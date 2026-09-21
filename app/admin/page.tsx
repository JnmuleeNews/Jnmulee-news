"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Source = {
  id: number;
  name: string;
  url: string;
  category: string;
  active: boolean;
};

export default function AdminPage() {
  const router = useRouter();

  const [sources, setSources] = useState<Source[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Top Stories");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSources() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const { data } = await supabase
      .from("sources")
      .select("id,name,url,category,active")
      .order("id", { ascending: false });

    setSources(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSources();
  }, []);

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("sources").insert({
      name: name.trim(),
      url: url.trim(),
      category,
      active: true,
    });