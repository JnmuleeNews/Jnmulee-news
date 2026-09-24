import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news-jnnation.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "JNMulee News",
    template: "%s | JNMulee News",
  },

  description:
    "JNMulee News brings you the latest news, breaking stories, sports, business, technology, entertainment and more from Nigeria and around the world.",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "JNMulee News",
    description:
      "Latest news and breaking stories from Nigeria and around the world.",
    url: siteUrl,
    siteName: "JNMulee News",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "JNMulee News",
    description:
      "Latest news and breaking stories from Nigeria and around the world.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}

        <footer
          style={{
            marginTop: "60px",
            background: "#111827",
            color: "#ffffff",
            borderTop: "4px solid #d7193f",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "40px 20px 24px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "32px",
              }}
            >
              <div>
                <Link
                  href="/"
                  style={{
                    color: "#ffffff",
                    textDecoration: "none",
                    fontSize: "26px",
                    fontWeight: 800,
                  }}
                >
                  JNMulee
                  <span style={{ color: "#d7193f" }}>
                    News
                  </span>
                </Link>

                <p
                  style={{
                    color: "#d1d5db",
                    lineHeight: 1.7,
                    marginTop: "12px",
                  }}
                >
                  Latest news, stories and information
                  from Nigeria and around the world.
                </p>
              </div>

              <div>
                <h3 style={{ marginBottom: "14px" }}>
                  Explore
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    color: "#d1d5db",
                  }}
                >
                  <Link
                    href="/"
                    style={{ color: "inherit" }}
                  >
                    Home
                  </Link>

                  <Link
                    href="/category/nigeria"
                    style={{ color: "inherit" }}
                  >
                    Nigeria
                  </Link>

                  <Link
                    href="/category/world"
                    style={{ color: "inherit" }}
                  >
                    World
                  </Link>

                  <Link
                    href="/category/business"
                    style={{ color: "inherit" }}
                  >
                    Business
                  </Link>

                  <Link
                    href="/category/technology"
                    style={{ color: "inherit" }}
                  >
                    Technology
                  </Link>

                  <Link
                    href="/category/sports"
                    style={{ color: "inherit" }}
                  >
                    Sports
                  </Link>
                </div>
              </div>

              <div>
                <h3 style={{ marginBottom: "14px" }}>
                  Information
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    color: "#d1d5db",
                  }}
                >
                  <Link
                    href="/about"
                    style={{ color: "inherit" }}
                  >
                    About
                  </Link>

                  <Link
                    href="/contact"
                    style={{ color: "inherit" }}
                  >
                    Contact
                  </Link>

                  <Link
                    href="/privacy"
                    style={{ color: "inherit" }}
                  >
                    Privacy Policy
                  </Link>

                  <Link
                    href="/terms"
                    style={{ color: "inherit" }}
                  >
                    Terms of Use
                  </Link>

                  <a
                    href="/sitemap.xml"
                    style={{ color: "inherit" }}
                  >
                    Sitemap
                  </a>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "32px",
                paddingTop: "20px",
                borderTop: "1px solid #374151",
                color: "#9ca3af",
                fontSize: "14px",
              }}
            >
              © {new Date().getFullYear()} JNMulee News.
              All rights reserved.
            </div>
          </div>
        </footer>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                document.addEventListener(
                  "contextmenu",
                  function (e) {
                    e.preventDefault();
                  },
                  true
                );

                document.addEventListener(
                  "copy",
                  function (e) {
                    e.preventDefault();
                  },
                  true
                );

                document.addEventListener(
                  "cut",
                  function (e) {
                    e.preventDefault();
                  },
                  true
                );

                document.addEventListener(
                  "dragstart",
                  function (e) {
                    e.preventDefault();
                  },
                  true
                );

                document.addEventListener(
                  "selectstart",
                  function (e) {
                    e.preventDefault();
                  },
                  true
                );

                document.addEventListener(
                  "keydown",
                  function (e) {
                    var key = (
                      e.key || ""
                    ).toLowerCase();

                    var blockedCopy =
                      (e.ctrlKey || e.metaKey) &&
                      (
                        key === "c" ||
                        key === "x" ||
                        key === "u" ||
                        key === "s" ||
                        key === "a" ||
                        key === "p"
                      );

                    var blockedDeveloperTools =
                      e.key === "F12" ||
                      (
                        e.ctrlKey &&
                        e.shiftKey &&
                        (
                          key === "i" ||
                          key === "j" ||
                          key === "c"
                        )
                      ) ||
                      (
                        e.metaKey &&
                        e.altKey &&
                        key === "i"
                      );

                    if (
                      blockedCopy ||
                      blockedDeveloperTools
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  },
                  true
                );
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}