import Link from "next/link";

export const metadata = {
  title: "Contact JNMulee News",
  description:
    "Contact JNMulee News for news corrections, business inquiries, advertising, privacy requests, and general questions.",
};

export default function ContactPage() {
  return (
    <main>
      <header className="header">
        <div className="container nav">
          <Link href="/" className="brand">
            JNMulee<span>News</span>
          </Link>

          <nav className="mainNav">
            <Link href="/">Home</Link>
            <Link href="/category/nigeria">Nigeria</Link>
            <Link href="/category/world">World</Link>
            <Link href="/category/business">Business</Link>
            <Link href="/category/technology">
              Technology
            </Link>
            <Link href="/category/sports">Sports</Link>
            <Link href="/category/entertainment">
              Entertainment
            </Link>
            <Link href="/category/politics">Politics</Link>
            <Link href="/category/crypto">Crypto</Link>
          </nav>
        </div>
      </header>

      <section className="section">
        <div className="container">
          <div className="pageContainer">
            <p className="sectionKicker">
              Get in touch
            </p>

            <h1>Contact JNMulee News</h1>

            <p>
              We welcome questions, news tips, corrections,
              business inquiries, advertising inquiries,
              privacy requests, and general feedback.
            </p>

            <h2>News Corrections</h2>

            <p>
              If you believe an article contains inaccurate
              information, please provide the article title,
              the specific information that needs correction,
              and supporting information where available.
            </p>

            <h2>News Tips</h2>

            <p>
              If you have information about a news event that
              you believe should be reported, provide as much
              useful information as possible and clearly
              identify information that is confidential.
            </p>

            <h2>Business and Advertising</h2>

            <p>
              Businesses and organizations can contact JNMulee
              News regarding advertising, partnerships,
              sponsorships, media opportunities, and other
              commercial matters.
            </p>

            <h2>Privacy Requests</h2>

            <p>
              For privacy questions or requests concerning
              personal information, please identify the
              nature of your request clearly.
            </p>

            <div className="emptyState">
              <h2>Contact form coming next</h2>

              <p>
                JNMulee News is preparing a secure contact
                form for messages, news tips, corrections,
                advertising inquiries, and privacy requests.
              </p>

              <p>
                Please check back soon.
              </p>
            </div>

            <p>
              <Link href="/">
                ← Back to JNMulee News
              </Link>
            </p>
          </div>
        </div>
      </section>

      <footer className="siteFooter">
        <div className="container">
          <div className="footerLinks">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">
              Privacy Policy
            </Link>
            <Link href="/terms">Terms</Link>
          </div>

          <p>
            © {new Date().getFullYear()} JNMulee News
          </p>
        </div>
      </footer>
    </main>
  );
}