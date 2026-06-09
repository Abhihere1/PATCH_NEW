"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Signup failed.");
      } else {
        sessionStorage.setItem("signup_success", "Account created! Please sign in.");
        router.push("/login");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid="signup-page" className="flex h-screen w-full">
      {/* Left Panel */}
      <div
        data-testid="signup-left-panel"
        className="hidden md:flex md:w-1/2 flex-col items-center justify-center p-12"
        style={{ background: "linear-gradient(135deg, #fafafa 0%, #fce4e4 100%)" }}
      >
        <div className="max-w-sm text-center">
          <div data-testid="patch-logo-signup" className="mb-8 flex justify-center">
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ background: "#DC2626" }}
              >
                P
              </div>
              <span className="text-2xl font-bold text-gray-900">Patch</span>
            </div>
          </div>
          <h1
            data-testid="signup-left-panel-title"
            className="text-3xl font-bold text-gray-900 mb-3 leading-tight"
          >
            Discount Tire Information Center
          </h1>
          <p data-testid="signup-left-panel-subtitle" className="text-gray-500 text-base">
            IT support, resolved faster.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div
        data-testid="signup-right-panel"
        className="flex w-full md:w-1/2 flex-col items-center justify-center bg-white px-8 py-12"
      >
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 data-testid="signup-heading" className="text-2xl font-bold text-gray-900 mb-1">
              Create your account
            </h2>
            <p className="text-sm text-gray-500">Join as a Discount Tire store associate</p>
          </div>

          <form
            data-testid="signup-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
          >
            <div>
              <label
                htmlFor="signup-username"
                data-testid="username-label"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1"
              >
                Username
              </label>
              <input
                id="signup-username"
                data-testid="signup-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div>
              <label
                htmlFor="signup-email"
                data-testid="signup-email-label"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1"
              >
                Email
              </label>
              <input
                id="signup-email"
                data-testid="signup-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@discounttire.com"
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div>
              <label
                htmlFor="signup-password"
                data-testid="signup-password-label"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1"
              >
                Password
              </label>
              <input
                id="signup-password"
                data-testid="signup-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>

            {error && (
              <p data-testid="signup-error" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              data-testid="signup-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: loading ? "#9ca3af" : "#DC2626" }}
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              data-testid="login-link"
              className="font-semibold"
              style={{ color: "#DC2626" }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
