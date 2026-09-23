"use client";

import { useEffect } from "react";

export default function ArticleViewTracker({
  newsId,
}: {
  newsId: string;
}) {
  useEffect(() => {
    const key = `jnmulee-viewed-${newsId}`;

    if (sessionStorage.getItem(key)) {
      return;
    }

    sessionStorage.setItem(key, "1");

    fetch("/api/news/view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        newsId,
      }),
    }).catch(() => {
      sessionStorage.removeItem(key);
    });
  }, [newsId]);

  return null;
}