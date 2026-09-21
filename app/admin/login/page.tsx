export default function Admin() {
  return (
    <main className="auth">
      <div className="authBox">
        <a className="brand" href="/">
          JNMulee <span>News</span>
        </a>

        <h1>Admin Dashboard</h1>

        <p>
          Connect Supabase Auth to activate secure administrator access.
        </p>

        <a href="/admin/login">Go to Admin Login</a>
        <br />
        <a href="/">Back to website</a>
      </div>
    </main>
  );
}