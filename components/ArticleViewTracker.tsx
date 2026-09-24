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

    fetch("/api/news/view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        newsId,
      }),
    })
      .then((response) => {
        if (response.ok) {
          sessionStorage.setItem(key, "1");
        }
      })
      .catch((error) => {
        console.error("View tracking error:", error);
      });
  }, [newsId]);

  return null;
}