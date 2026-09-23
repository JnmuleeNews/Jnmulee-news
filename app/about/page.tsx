import Link from "next/link";

export const metadata = {
  title: "About JNMulee News",
  description:
    "Learn more about JNMulee News, our mission and the news we provide.",
};

export default function AboutPage() {
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
        <h1>About JNMulee News</h1>

        <p>
          Welcome to JNMulee News, a digital news platform created
          to provide readers with timely news and information from
          Nigeria and around the world.
        </p>

        <h2>What We Cover</h2>

        <p>
          JNMulee News covers a wide range of topics, including
          breaking news, sports, entertainment, gossip, business,
          technology, politics, and cryptocurrency.
        </p>

        <h2>Our Mission</h2>

        <p>
          Our mission is to make news easy to discover, read, and
          share while providing a fast and accessible experience
          across mobile and desktop devices.
        </p>

        <h2>News Sources</h2>

        <p>
          JNMulee News may publish stories obtained through
          authorized news feeds and other sources. Imported
          information is processed and organized for presentation
          on our platform.
        </p>

        <h2>Contact Us</h2>

        <p>
          For questions, corrections, business inquiries, or other
          matters, please visit our contact page.
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