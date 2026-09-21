type Props = {
  params: Promise<{ slug: string }>;
};

export default async function Article({ params }: Props) {
  const { slug } = await params;

  return (
    <main>
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            JNMulee <span>News</span>
          </a>
          <a href="/">⌂ Home</a>
        </div>
      </header>

      <article className="container article">
        <p className="category">JNMulee News</p>

        <h1>Story {slug}</h1>

        <p className="meta">Published by JNMulee News</p>

        <div className="articleBody">
          <p>
            This article page is ready to connect to the Supabase news
            database.
          </p>

          <p>
            The production version can display the headline, summary,
            source attribution, and full original JNMulee News summary here.
          </p>
        </div>
      </article>
    </main>
  );
}