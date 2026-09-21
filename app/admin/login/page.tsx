export default function AdminLogin() {
  return (
    <main className="auth">
      <div className="authBox">
        <a className="brand" href="/">
          JNMulee <span>News</span>
        </a>

        <h1>Admin Login</h1>

        <p>Sign in to access the JNMulee News administration area.</p>

        <input placeholder="Email" type="email" />
        <input placeholder="Password" type="password" />

        <button type="button">Sign in</button>

        <br />
        <a href="/">Back to website</a>
      </div>
    </main>
  );
}