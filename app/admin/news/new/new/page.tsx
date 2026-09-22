"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NewNewsPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Top Stories");
  const [content, setContent] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [status, setStatus] = useState("Draft");
  const [saving, setSaving] = useState(false);

  async function saveNews() {
    if (!title.trim() || !content.trim()) {
      alert("Please enter a title and content.");
      return;
    }

    setSaving(true);

    const slug =
      title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") +
      "-" +
      Date.now();

    const { error } = await supabase.from("news").insert({
      title: title.trim(),
      slug,
      content: content.trim(),
      category,
      image_url: null,
      source_url: null,
      Published: status === "Published",
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      status === "Published"
        ? "News published successfully."
        : "News saved as draft."
    );

    setTitle("");
    setContent("");
    setImageCaption("");
  }

  return (
    <main className="dashboardPage">
      <header className="dashboardHeader">
        <div className="container">
          <a className="brand" href="/admin">
            JNMulee <span>News</span>
          </a>

          <a href="/admin">Back to Dashboard</a>
        </div>
      </header>

      <section className="container section">
       