import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | JNMulee News",
  description:
    "Privacy Policy for JNMulee News.",
};

export default function PrivacyPage() {
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
        <h1>Privacy Policy</h1>

        <p>
          This Privacy Policy explains how JNMulee News may collect,
          use, and protect information when you use our website.
        </p>

        <h2>Information We Collect</h2>

        <p>
          JNMulee News may collect information that you voluntarily
          provide, such as information submitted when posting a
          comment or contacting us.
        </p>

        <p>
          We may also collect technical information such as browser
          type, device information, pages visited, and general
          usage information.
        </p>

        <h2>Comments</h2>

        <p>
          If you post a comment, the name and comment information
          you provide may be stored and displayed on the website.
          Comments may be reviewed before publication.
        </p>

        <h2>Cookies</h2>

        <p>
          JNMulee News and third-party services may use cookies or
          similar technologies to improve website functionality,
          understand website usage, and provide relevant advertising.
        </p>

        <h2>Advertising</h2>

        <p>
          JNMulee News may display advertisements from third-party
          advertising providers, including Google AdSense.
        </p>

        <p>
          Third-party advertising providers may use cookies or
          similar technologies to provide advertisements and measure
          advertising performance, subject to their own privacy
          policies and applicable laws.
        </p>

        <h2>Analytics</h2>

        <p>
          We may use analytics services to understand how visitors
          use the website, improve performance, and develop better
          content and features.
        </p>

        <h2>External Websites</h2>

        <p>
          Our website may contain links to external websites. We are
          not responsible for the privacy practices or content of
          websites operated by third parties.
        </p>

        <h2>Data Security</h2>

        <p>
          We take reasonable measures to protect information
          handled through our website. However, no internet
          transmission or storage system can be guaranteed to be
          completely secure.
        </p>

        <h2>Your Privacy Rights</h2>

        <p>
          Depending on your location and applicable law, you may
          have rights relating to your personal information,
          including rights to request access, correction, or
          deletion of certain information.
        </p>

        <h2>Changes to This Policy</h2>

        <p>
          We may update this Privacy Policy when our website,
          services, or legal requirements change. Updates will be
          published on this page.
        </p>

        <h2>Contact</h2>

        <p>
          If you have questions about this Privacy Policy, please
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