const stories = [
  ["Top Stories", "JNMulee News launches a new way to follow the stories that matter"],
  ["World", "Global developments to watch today"],
  ["Business", "Markets and businesses in focus"],
  ["Technology", "Technology is changing how people get information"],
];

export default function Home() {
  return (
    <main>
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            JNMulee <span>News</span>
          </a>

          <nav>
            <a href="/">Home</a>
            <a href="/category/world">World</a>
            <a href="/category/business">Business</a>
            <a href="/category/technology">Technology</a>
            <a href="/admin/login">Admin</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <p className="eyebrow">JNMulee News</p>
          <h1>News that keeps you informed.</h1>
          <p className="lead">
            Fast, readable coverage across world news, business,
            technology and more.
          </p>

          <div className="search">
            <input placeholder="Search JNMulee News..." />
            <button type="button">Search</button>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="sectionTitle">
          <h2>Latest stories</h2>
          <span>Updated regularly</span>
        </div>

        <div className="grid">
          {stories.map((story, i) => (
            <article
              className={i === 0 ? "card featured" : "card"}
              key={story[1]}
            >
              <div className="placeholder">JNMulee News</div>

              <p className="category">{story[0]}</p>

              <h3>
                <a href={`/news/${i + 1}`}>{story[1]}</a>
              </h3>

              <p>
                Clear, concise coverage prepared for JNMulee News readers.
              </p>

              <small>Read more →</small>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <div className="container">
          © {new Date().getFullYear()} JNMulee News. All rights reserved.
        </div>
      </footer>
    </main>
  );
}