import Link from "next/link";

export const metadata = {
  title: "Terms of Use | JNMulee News",
  description:
    "Terms of Use governing access to and use of JNMulee News.",
};

export default function TermsPage() {
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

            <h1>Terms of Use</h1>

            <p>
              By accessing or using JNMulee News, you agree
              to these Terms of Use. If you do not agree,
              please do not use the website.
            </p>

            <h2>Use of the Website</h2>

            <p>
              JNMulee News provides news, information,
              commentary, and related content for general
              informational purposes.
            </p>

            <p>
              You agree to use the website lawfully and not
              to interfere with its operation, security, or
              availability.
            </p>

            <h2>News Content</h2>

            <p>
              We make reasonable efforts to provide useful
              and accurate information. However, news and
              other information can change, may contain
              errors, and should be independently verified
              when important decisions depend on it.
            </p>

            <p>
              Content on JNMulee News is not a substitute for
              professional legal, financial, medical, or
              other professional advice.
            </p>

            <h2>User Comments</h2>

            <p>
              Users may be allowed to submit comments on
              articles. You are responsible for the content
              of comments you submit.
            </p>

            <p>
              Comments must not contain unlawful,
              threatening, abusive, defamatory, fraudulent,
              hateful, or otherwise inappropriate material.
            </p>

            <p>
              JNMulee News may moderate, reject, edit where
              appropriate, or remove comments that violate
              these terms or applicable law.
            </p>

            <h2>Intellectual Property</h2>

            <p>
              Unless otherwise stated, original JNMulee News
              branding, website design, original text,
              graphics, and other materials created by
              JNMulee News are protected by applicable
              intellectual-property laws.
            </p>

            <p>
              Third-party material remains the property of
              its respective rights holders.
            </p>

            <h2>External Websites</h2>

            <p>
              JNMulee News may contain links to third-party
              websites. We do not control those websites and
              are not responsible for their content,
              availability, security, or privacy practices.
            </p>

            <h2>Advertising</h2>

            <p>
              JNMulee News may display advertisements from
              JNMulee News or third-party advertising
              providers.
            </p>

            <h2>Website Availability</h2>

            <p>
              We may change, suspend, restrict, or discontinue
              parts of the website when necessary for
              maintenance, security, improvements, or other
              operational reasons.
            </p>

            <h2>Prohibited Activities</h2>

            <p>
              You must not attempt to gain unauthorized access
              to the website, interfere with website
              security, introduce malicious code, abuse
              website features, or use the website for
              unlawful purposes.
            </p>

            <h2>Changes to These Terms</h2>

            <p>
              These Terms of Use may be updated from time to
              time. Updated terms will be published on this
              page.
            </p>

            <h2>Contact</h2>

            <p>
              If you have questions about these Terms of Use,
              please contact JNMulee News.
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