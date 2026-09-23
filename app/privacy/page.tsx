import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | JNMulee News",
  description:
    "Privacy Policy explaining how JNMulee News handles information, cookies, comments, advertising and privacy.",
};

export default function PrivacyPage() {
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
              Legal
            </p>

            <h1>Privacy Policy</h1>

            <p>
              JNMulee News respects your privacy. This
              Privacy Policy explains what information may
              be collected when you use our website and how
              that information may be used.
            </p>

            <h2>Information We Collect</h2>

            <p>
              We may collect information that you
              voluntarily provide when you use features of
              the website, including comments, contact
              requests, and other forms or communications.
            </p>

            <p>
              We may also collect technical information
              such as your browser type, device type,
              approximate location, pages visited, referring
              pages, and information about how you interact
              with the website.
            </p>

            <h2>Comments</h2>

            <p>
              When you submit a comment, the name and
              comment information you provide may be stored
              by JNMulee News.
            </p>

            <p>
              Comments may be reviewed, moderated, approved,
              rejected, or removed before or after
              publication.
            </p>

            <h2>Cookies</h2>

            <p>
              JNMulee News may use cookies and similar
              technologies to operate the website, remember
              preferences, understand website usage, and
              improve the user experience.
            </p>

            <p>
              Third-party services used on the website may
              also use cookies according to their own
              privacy policies.
            </p>

            <h2>Advertising</h2>

            <p>
              JNMulee News may display advertisements,
              including advertisements provided by
              third-party advertising services such as
              Google AdSense.
            </p>

            <p>
              Advertising providers may use cookies or
              similar technologies to display advertisements,
              measure advertising performance, and provide
              advertising that may be relevant to users.
            </p>

            <h2>Analytics</h2>

            <p>
              We may use analytics technologies to understand
              traffic and website usage and to improve the
              website, content, security, and services.
            </p>

            <h2>How We Use Information</h2>

            <p>
              Information may be used to operate and improve
              JNMulee News, respond to communications,
              moderate comments, protect the website,
              understand website usage, and provide
              advertising or other services.
            </p>

            <h2>Third-Party Services</h2>

            <p>
              JNMulee News may use third-party services for
              hosting, database services, analytics,
              advertising, security, content delivery, and
              other website functions.
            </p>

            <p>
              Those services may process information according
              to their own terms and privacy policies.
            </p>

            <h2>External Links</h2>

            <p>
              Articles and pages on JNMulee News may contain
              links to external websites. We are not
              responsible for the privacy practices, security,
              or content of external websites.
            </p>

            <h2>Data Security</h2>

            <p>
              We use reasonable technical and organizational
              measures to protect information handled through
              the website. However, no online service can
              guarantee absolute security.
            </p>

            <h2>Your Privacy Rights</h2>

            <p>
              Depending on where you live and the laws that
              apply to you, you may have rights concerning
              your personal information, including rights to
              request access, correction, deletion, or other
              privacy-related actions.
            </p>

            <h2>Children's Privacy</h2>

            <p>
              JNMulee News is not intended to knowingly
              collect personal information from children in
              violation of applicable law.
            </p>

            <h2>Changes to This Policy</h2>

            <p>
              We may update this Privacy Policy from time to
              time. When changes are made, the updated policy
              will be published on this page.
            </p>

            <h2>Contact</h2>

            <p>
              If you have a privacy question, data request,
              correction request, or other privacy concern,
              please use our contact page.
            </p>

            <p>
              <Link href="/contact">
                Contact JNMulee News →
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