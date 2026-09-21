export default function Admin() {
  return (
    <main>
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            JNMulee <span>News</span>
          </a>
          <a href="/">View site</a>
        </div>
      </header>

      <section className="container section">
        <p className="eyebrow">Administration</p>
        <h1>News Dashboard</h1>

        <div className="dashboard">
          <div>
            <strong>0</strong>
            <span>Published stories</span>
          </div>

          <div>
            <strong>0</strong>
            <span>Sources</span>
          </div>

          <div>
            <strong>Ready</strong>
            <span>Platform status</span>
          </div>
        </div>
      </section>
    </main>
  );
}