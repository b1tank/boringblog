"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "操作失败");
        return;
      }

      setSent(true);
    } catch {
      setError("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center px-4 -mt-8" style={{ minHeight: 'calc(100vh - 10rem)' }}>
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            忘记密码
          </h1>
          <p className="text-sm text-muted text-center mb-8">
            输入您的邮箱，我们将发送重置链接
          </p>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="bg-green-50 text-green-700 rounded-lg px-4 py-3 text-sm">
                重置链接已发送到您的邮箱
              </div>
              <Link
                href="/login"
                className="inline-block text-sm text-muted hover:text-foreground transition-colors"
              >
                返回登录
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-muted mb-1.5"
                >
                  邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-foreground focus:border-transparent transition-shadow"
                  placeholder="your@email.com"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3.5 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-foreground text-white rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "发送中…" : "发送重置链接"}
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  返回登录
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
