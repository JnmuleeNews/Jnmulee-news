"use client";

type Props = {
  title: string;
  url: string;
};

export default function ShareButtons({ title, url }: Props) {
  const facebookUrl =
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  const xUrl =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  async function shareInstagram() {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: title,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Article link copied. You can paste it into Instagram.");
      }
    } catch {
      // User cancelled sharing.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      alert("Article link copied!");
    } catch {
      alert("Unable to copy the link.");
    }
  }

  return (
    <section className="shareBox" aria-label="Share this article">
      <h3>Share this article</h3>

      <div className="shareButtons">
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shareButton shareFacebook"
        >
          Facebook
        </a>

        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shareButton shareX"
        >
          X
        </a>

        <button
          type="button"
          onClick={shareInstagram}
          className="shareButton shareInstagram"
        >
          Instagram
        </button>

        <button
          type="button"
          onClick={copyLink}
          className="shareButton shareCopy"
        >
          Copy Link
        </button>
      </div>
    </section>
  );
}