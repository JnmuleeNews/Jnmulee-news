import Link from "next/link";

export const metadata = {
  title: "Terms of Use | JNMulee News",
  description: "Terms of Use for JNMulee News.",
};

export default function TermsPage() {
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
        <h1>Terms of Use</h1>

        <p>
          By accessing or using JNMulee News, you agree to these
          Terms of Use. If you do not agree with these terms, please
          do not use the website.
        </p>

        <h2>Use of the Website</h2>

        <p>
          JNMulee News provides news, information, commentary, and
          other content for general informational purposes.
        </p>

        <p>
          You agree to use the website lawfully and not to interfere
          with the operation or security of the website.
        </p>

        <h2>News and Information</h2>

        <p>
          We work to provide useful and accurate information, but
          news and other information may change or contain errors.
          Content should not be treated as professional legal,
          financial, medical, or other professional advice.
        </p>

        <h2>User Comments</h2>

        <p>
          Users may be permitted to submit comments on articles.
          Comments must not contain unlawful, threatening,
          defamatory, abusive, misleading, or otherwise inappropriate
          material.
        </p>

        <p>
          JNMulee News may review, moderate, reject, or remove
          comments that violate these terms or applicable rules.
        </p>

        <h2>Intellectual Property</h2>

        <p>
          Unless otherwise stated, website design, branding,
          original text, graphics, and other materials created by
          JNMulee News belong to JNMulee News or their respective
          rights holders.
        </p>

        <p>
          You may not reproduce or redistribute protected material
          from this website without appropriate permission or legal
          authorization.
        </p>

        <h2>External Links</h2>

        <p>
          JNMulee News may link to websites operated by third
          parties. We do not control and are not responsible for
          third-party websites or their content.
        </p>

        <h2>Advertising</h2>

        <p>
          The website may display advertisements from JNMulee News
          or third-party advertising providers.
        </p>

        <h2>Website Availability</h2>

        <p>
          We may modify, suspend, or discontinue portions of the
          website or individual features when necessary for
          maintenance, security, improvements, or other reasons.
        </p>

        <h2>Changes to These Terms</h2>

        <p>
          We may update these Terms of Use from time to time. Any
          updated version will be published on this page.
        </p>

        <h2>Contact</h2>

        <p>
          If you have questions about these Terms of Use, please
          visit our contact page.
        </p>

        <p>
          <Link href="/contact">Contact JNMulee News</Link>
        </p>
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