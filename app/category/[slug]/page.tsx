type Props = {
  params: Promise<{ slug: string }>;
};

export default async function Category({ params }: Props) {
  const { slug } = await params;
  const name = slug.charAt(0).toUpperCase() + slug.slice(1);

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

      <section className="container section">
        <p className="eyebrow">Category</p>
        <h1>{name} News</h1>
        <p className="lead">
          Stories in this category will appear here.
        </p>
      </section>
    </main>
  );
}