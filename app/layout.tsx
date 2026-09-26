import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jnmulee-news.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "JNMulee News",
    template: "%s | JNMulee News",
  },
  description:
    "JNMulee News brings you the latest breaking news, Nigeria news, world news, business, technology, sports, entertainment, gossip and crypto.",
  keywords: [
    "JNMulee News",
    "Nigeria News",
    "Breaking News",
    "World News",
    "Sports News",
    "Business News",
    "Technology News",
    "Entertainment News",
    "Gossip",
    "Crypto News",
  ],
  authors: [{ name: "JNMulee News" }],
  creator: "JNMulee News",
  publisher: "JNMulee News",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: "JNMulee News",
    title: "JNMulee News",
    description:
      "Latest breaking news, Nigeria news, world news, business, technology, sports, entertainment and more.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "JNMulee News",
    description:
      "Latest breaking news, Nigeria news, world news, business, technology, sports and entertainment.",
  },
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
          background: "#f7f9fc",
          color: "#111827",
          fontFamily:
            "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1 }}>
            {children}
          </div>

          <footer
            style={{
              marginTop: "60px",
              background:
                "linear-gradient(180deg, #020617 0%, #080e19 100%)",
              color: "#ffffff",
              borderTop:
                "3px solid #22d3ee",
            }}
          >
            <div
              style={{
                maxWidth: "1200px",
                margin: "0 auto",
                padding:
                  "48px 20px 24px",
              }}
            >
              {/* FOOTER BRAND */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent:
                    "space-between",
                  gap: "40px",
                }}
              >
                <div
                  style={{
                    maxWidth: "420px",
                  }}
                >
                  <a
                    href="/"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      textDecoration:
                        "none",
                      color: "#ffffff",
                      fontSize: "25px",
                      fontWeight: 900,
                      letterSpacing:
                        "-0.5px",
                    }}
                  >
                    <span
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        display: "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        background:
                          "linear-gradient(135deg, #22d3ee, #06b6d4)",
                        color: "#020617",
                        fontWeight: 900,
                        boxShadow:
                          "0 8px 24px rgba(34,211,238,0.25)",
                      }}
                    >
                      JN
                    </span>

                    <span>
                      JNMulee{" "}
                      <span
                        style={{
                          color: "#67e8f9",
                        }}
                      >
                        News
                      </span>
                    </span>
                  </a>

                  <p
                    style={{
                      marginTop: "18px",
                      marginBottom: "18px",
                      color: "#94a3b8",
                      fontSize: "15px",
                      lineHeight: 1.7,
                    }}
                  >
                    JNMulee News brings you
                    the latest news and
                    stories from Nigeria,
                    Africa and around the
                    world.
                  </p>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding:
                        "8px 12px",
                      borderRadius: "999px",
                      background:
                        "rgba(34,211,238,0.10)",
                      border:
                        "1px solid rgba(103,232,249,0.18)",
                      color: "#a5f3fc",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius:
                          "50%",
                        background:
                          "#67e8f9",
                        display:
                          "inline-block",
                      }}
                    />
                    Independent News
                  </div>
                </div>

                {/* EXPLORE */}
                <div
                  style={{
                    minWidth: "150px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 16px",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: 800,
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    EXPLORE
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gap: "11px",
                    }}
                  >
                    <a
                      href="/"
                      style={{
                        color: "#b8c2d1",
                        textDecoration:
                          "none",
                        fontSize: "14px",
                      }}
                    >
                      Home
                    </a>

                    <a
                      href="/category/nigeria"
                      style={{
                        color: "#b8c2d1",
                        textDecoration:
                          "none",
                        fontSize: "14px",
                      }}
                    >
                      Nigeria
                    </a>

                    <a
                      href="/category/world"
                      style={{
                        color: "#b8c2d1",
                        textDecoration:
                          "none",
                        fontSize: "14px",
                      }}
                    >
                      World
                    </a>

                    <a
                      href="/category/business"
                      style={{
                        color: "#b8c2d1",
                        textDecoration:
                          "none",
                        fontSize: "14px",
                      }}
                    >
                      Business
                    </a>

                    <a
                      href="/category/technology"
                      style={{
                        color: "#b8c2d1",
                        textDecoration:
                          "none",
                        fontSize: "14px",
                      }}
                    >
                      Technology
                    </a>

                    <a
                      href="/category/sports"
                      style={{
                        color: "#b8c2d1",
                        textDecoration:
                          "none",
                        fontSize: "14px",
                      }}
                    >
                      Sports
                    </a>
                  </div>
                </div>

                {/* INFORMATION */}
                <div
                  style={{
                    minWidth: "170px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 16px",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: 800,
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    INFORMATION
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gap: "11px",
                    }}
                  >
                    <a
                      href="/about"
                      style={{
                        color: "#b8c2d1",
                        textDecoration:
                          "none",
                        fontSize: "14px",
                      }}
                    >
                      About
                    </a>

                    <a
                      href="/contact"
                      style={{
                        color: "#b8c2d1",
                        textDecoration:
                          "none",
                        fontSize: "14px",
                      }}
                    >
                      Contact
                    </a>

                    <a
                      href="/privacy"
                      style={{
                        color: "#b8c2d1",
                        textDecoration:
                          "none",
                        fontSize: "14px",
                      }}
                    >
                      Privacy Policy
                    </a>

                    <a
                      href="/terms"
                      style={{
                        color: "#b8c2d1",
                        textDecoration:
                          "none",
                        fontSize: "14px",
                      }}
                    >
                      Terms of Use
                    </a>

                    <a
                      href="/search"
                      style={{
                        color: "#b8c2d1",
                        textDecoration:
                          "none",
                        fontSize: "14px",
                      }}
                    >
                      Search
                    </a>

                    <a
                      href="/sitemap.xml"
                      style={{
                        color: "#b8c2d1",
                        textDecoration:
                          "none",
                        fontSize: "14px",
                      }}
                    >
                      Sitemap
                    </a>
                  </div>
                </div>
              </div>

              {/* DIVIDER */}
              <div
                style={{
                  height: "1px",
                  background:
                    "rgba(148,163,184,0.15)",
                  margin:
                    "38px 0 20px",
                }}
              />

              {/* COPYRIGHT */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                <span>
                  © {new Date().getFullYear()}{" "}
                  JNMulee News. All rights
                  reserved.
                </span>

                <span>
                  News • Nigeria • World •
                  Business • Sports •
                  Technology
                </span>
              </div>
            </div>

            <style
              dangerouslySetInnerHTML={{
                __html: `
                  @media (max-width: 700px) {
                    footer {
                      margin-top: 40px !important;
                    }

                    footer > div {
                      padding-left: 16px !important;
                      padding-right: 16px !important;
                    }

                    footer a {
                      word-break: normal;
                    }
                  }

                  footer a:hover {
                    color: #67e8f9 !important;
                  }
                `,
              }}
            />
          </footer>
        </div>

        {/* Basic copy/context protection */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener("contextmenu", function(e) {
                e.preventDefault();
              });

              document.addEventListener("copy", function(e) {
                e.preventDefault();
              });

              document.addEventListener("cut", function(e) {
                e.preventDefault();
              });

              document.addEventListener("dragstart", function(e) {
                e.preventDefault();
              });

              document.addEventListener("selectstart", function(e) {
                if (
                  e.target &&
                  e.target.tagName !== "INPUT" &&
                  e.target.tagName !== "TEXTAREA"
                ) {
                  e.preventDefault();
                }
              });

              document.addEventListener("keydown", function(e) {
                if (
                  (e.ctrlKey || e.metaKey) &&
                  ["u", "s", "c"].includes(
                    String(e.key).toLowerCase()
                  )
                ) {
                  e.preventDefault();
                }

                if (
                  e.ctrlKey &&
                  e.shiftKey &&
                  ["i", "j", "c"].includes(
                    String(e.key).toLowerCase()
                  )
                ) {
                  e.preventDefault();
                }

                if (e.key === "F12") {
                  e.preventDefault();
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}