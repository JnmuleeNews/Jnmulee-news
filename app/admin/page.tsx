<input
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Example News"
  required
/>

<label>RSS / Feed URL</label>

<input
  value={feedUrl}
  onChange={(e) => setFeedUrl(e.target.value)}
  placeholder="https://example.com/feed"
  required
/>

<label>Category</label>

<select
  value={category}
  onChange={(e) => setCategory(e.target.value)}
>
  <option>Top Stories</option>
  <option>Nigeria</option>
  <option>World</option>
  <option>Business</option>
  <option>Technology</option>
  <option>Sports</option>
  <option>Entertainment</option>
</select>

<button type="submit" disabled={saving}>
  {saving ? "Saving..." : "Add Source"}
</button>
</form>

<h2>Connected Sources</h2>

{loading ? (
  <p>Loading sources...</p>
) : sources.length === 0 ? (
  <p>No sources connected yet.</p>
) : (
  <div className="form">
    {sources.map((source) => (
      <div key={source.id}>
        <strong>{source.name}</strong>
        <p>{source.feed_url}</p>
        <p>{source.category}</p>
        <p>
          Status: {source.active ? "Active" : "Inactive"}
        </p>

        <button
          type="button"
          onClick={() => deleteSource(source.id)}
        >
          Delete
        </button>
      </div>
    ))}
  </div>
)}
</section>
</main>
);
}