import Link from "next/link";

export const metadata = {
  title: "Contact JNMulee News",
  description:
    "Contact JNMulee News for questions, corrections, business inquiries and other matters.",
};

export default function ContactPage() {
  return (
    <main>
      <header className="siteHeader">
        <div className="container headerInner">
          <Link href="/" className="logo">
            JNMulee News
          </Link>

          <nav>
            <Link href="/">Home</Link>
            <Link href="/search">Search</Link>
            <Link href="/category/news">News</Link>
            <Link href="/category/sport">Sports</Link>
            <Link href="/category/entertainment">
              Entertainment
            </Link>
            <Link href="/category/gossip">Gossip</Link>
            <Link href="/category/business">Business</Link>
            <Link href="/category/crypto">Crypto</Link>
          </nav>
        </div>
      </header>

      <div className="container pageContainer">
        <h1>Contact JNMulee News</h1>

        <p>
          We welcome questions, feedback, corrections, business
          inquiries, advertising inquiries, and other messages
          concerning JNMulee News.
        </p>

        <h2>News Corrections</h2>

        <p>
          If you believe information published on JNMulee News is
          inaccurate, please contact us with the article title and
          details of the correction.
        </p>

        <h2>Business and Advertising</h2>

        <p>
          For advertising, partnerships, sponsorships, and other
          business inquiries, please contact the JNMulee News team.
        </p>

        <h2>General Inquiries</h2>

        <p>
          Please send us a clear description of your inquiry so that
          we can properly review your message.
        </p>

        <div className="emptyState">
          <h2>Contact information</h2>

          <p>
            Email contact details will be published here when the
            official JNMulee News contact address is available.
          </p>
        </div>
      </div>

      <footer className="siteFooter">
        <div className="container">
          <div className="footerLinks">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy Policy</Link>
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