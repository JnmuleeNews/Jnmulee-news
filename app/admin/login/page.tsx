"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (user) {
          const role = user.app_metadata?.role;

          if (role === "admin") {
            router.replace("/admin");
            return;
          }

          await supabase.auth.signOut();
        }
      } catch {
        // Stay on login page if session checking fails.
      }

      if (mounted) {
        setCheckingSession(false);
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError(
        "Please enter your email and password."
      );
      setLoading(false);
      return;
    }

    try {
      const {
        data,
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        setError(
          signInError.message ||
            "Invalid email or password."
        );
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError(
          "Sign-in was not completed. Please try again."
        );
        setLoading(false);
        return;
      }

      const role = data.user.app_metadata?.role;

      if (role !== "admin") {
        await supabase.auth.signOut();

        setError(
          "This account does not have administrator access."
        );
        setLoading(false);
        return;
      }

      /*
       * Give Supabase time to persist the authenticated
       * session cookies before navigating to the protected
       * admin route.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 150)
      );

      router.replace("/admin");
      router.refresh();
    } catch {
      setError(
        "Unable to sign in right now. Please try again."
      );
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="auth">
        <div className="authBox">
          <Link href="/" className="brand">
            JNMulee <span>News</span>
          </Link>

          <div
            style={{
              textAlign: "center",
              padding: "28px 0",
              color: "#64748b",
            }}
          >
            Checking your session...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth">
      <form
        className="authBox"
        onSubmit={handleLogin}
      >
        <Link href="/" className="brand">
          JNMulee <span>News</span>
        </Link>

        <h1>Admin Login</h1>

        <p>
          Sign in to access the JNMulee News
          administration area.
        </p>

        <label htmlFor="admin-email">
          Email
        </label>

        <input
          id="admin-email"
          name="email"
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          disabled={loading}
        />

        <label htmlFor="admin-password">
          Password
        </label>

        <input
          id="admin-password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          autoComplete="current-password"
          required
          disabled={loading}
        />

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 4,
              padding: "11px 13px",
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Signing in..."
            : "Sign in"}
        </button>

        <Link href="/">
          Back to website
        </Link>
      </form>
    </main>
  );
}