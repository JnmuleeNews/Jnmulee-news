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

const footerLinkStyle: React.CSSProperties = {
  color: "#b8c2d1",
  textDecoration: "none",
  fontSize: "14px",
  lineHeight: 1.5,
  transition: "color 0.2s ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#f7f9fc",
          color: "#111827",
          fontFamily:
            "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            flex: "1 0 auto",
            width: "100%",
          }}
        >
          {children}
        </div>

        {/* GLOBAL FOOTER */}
        <footer
          style={{
            flexShrink: 0,
            background:
              "linear-gradient(180deg, #0b1220 0%, #080e19 100%)",
            color: "#ffffff",
            borderTop: "3px solid #2563eb",
            marginTop: "56px",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "52px 20px 24px",
            }}
          >
            {/* FOOTER TOP */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(260px, 1.5fr) repeat(2, minmax(180px, 1fr))",
                gap: "48px",
              }}
            >
              {/* BRAND */}
              <div>
                <Link
                  href="/"
                  aria-label="JNMulee News home"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "11px",
                    color: "#ffffff",
                    textDecoration: "none",
                  }}
                >
                  <span
                    style={{
                      width: "42px",
                      height: "42px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "11px",
                      background:
                        "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      color: "#ffffff",
                      fontSize: "15px",
                      fontWeight: 900,
                      letterSpacing: "-0.5px",
                      boxShadow:
                        "0 8px 24px rgba(37, 99, 235, 0.28)",
                    }}
                  >
                    JN
                  </span>

                  <span
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "5px",
                      fontSize: "25px",
                      fontWeight: 800,
                      letterSpacing: "-0.8px",
                    }}
                  >
                    <span>JNMulee</span>

                    <span
                      style={{
                        color: "#60a5fa",
                        fontWeight: 700,
                      }}
                    >
                      News
                    </span>
                  </span>
                </Link>

                <p
                  style={{
                    maxWidth: "410px",
                    color: "#aeb9c9",
                    lineHeight: 1.75,
                    marginTop: "18px",
                    marginBottom: 0,
                    fontSize: "14px",
                  }}
                >
                  JNMulee News brings you the latest news,
                  stories and information from Nigeria and
                  around the world.
                </p>

                <div
                  style={{
                    marginTop: "22px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "999px",
                    background: "rgba(37, 99, 235, 0.10)",
                    border:
                      "1px solid rgba(96, 165, 250, 0.18)",
                    color: "#93c5fd",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: "#60a5fa",
                      display: "inline-block",
                    }}
                  />
                  News from Nigeria & the world
                </div>
              </div>

              {/* EXPLORE */}
              <div>
                <h3
                  style={{
                    margin: 0,
                    marginBottom: "18px",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 800,
                    letterSpacing: "0.4px",
                  }}
                >
                  EXPLORE
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "11px",
                  }}
                >
                  <Link href="/" style={footerLinkStyle}>
                    Home
                  </Link>

                  <Link
                    href="/category/nigeria"
                    style={footerLinkStyle}
                  >
                    Nigeria
                  </Link>

                  <Link
                    href="/category/world"
                    style={footerLinkStyle}
                  >
                    World
                  </Link>

                  <Link
                    href="/category/business"
                    style={footerLinkStyle}
                  >
                    Business
                  </Link>

                  <Link
                    href="/category/technology"
                    style={footerLinkStyle}
                  >
                    Technology
                  </Link>

                  <Link
                    href="/category/sports"
                    style={footerLinkStyle}
                  >
                    Sports
                  </Link>
                </div>
              </div>

              {/* INFORMATION */}
              <div>
                <h3
                  style={{
                    margin: 0,
                    marginBottom: "18px",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 800,
                    letterSpacing: "0.4px",
                  }}
                >
                  INFORMATION
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "11px",
                  }}
                >
                  <Link
                    href="/about"
                    style={footerLinkStyle}
                  >
                    About
                  </Link>

                  <Link
                    href="/contact"
                    style={footerLinkStyle}
                  >
                    Contact
                  </Link>

                  <Link
                    href="/privacy"
                    style={footerLinkStyle}
                  >
                    Privacy Policy
                  </Link>

                  <Link
                    href="/terms"
                    style={footerLinkStyle}
                  >
                    Terms of Use
                  </Link>

                  <Link
                    href="/search"
                    style={footerLinkStyle}
                  >
                    Search
                  </Link>

                  <a
                    href="/sitemap.xml"
                    style={footerLinkStyle}
                  >
                    Sitemap
                  </a>
                </div>
              </div>
            </div>

            {/* FOOTER DIVIDER */}
            <div
              style={{
                marginTop: "44px",
                paddingTop: "22px",
                borderTop:
                  "1px solid rgba(255,255,255,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  color: "#7f8da1",
                  fontSize: "13px",
                }}
              >
                © {new Date().getFullYear()} JNMulee News.
                All rights reserved.
              </div>

              <div
                style={{
                  color: "#6f7d91",
                  fontSize: "12px",
                }}
              >
                Independent news & information
              </div>
            </div>
          </div>

          {/* MOBILE FOOTER ADJUSTMENTS */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @media (max-width: 760px) {
                  footer > div {
                    padding-left: 16px !important;
                    padding-right: 16px !important;
                  }

                  footer > div > div:first-child {
                    grid-template-columns: 1fr !important;
                    gap: 34px !important;
                  }
                }

                @media (max-width: 480px) {
                  footer {
                    margin-top: 40px !important;
                  }

                  footer > div {
                    padding-top: 40px !important;
                  }
                }
              `,
            }}
          />
        </footer>

        {/* BASIC COPY / CONTEXT PROTECTION */}
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