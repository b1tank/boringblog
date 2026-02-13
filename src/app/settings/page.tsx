"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AUTHOR";
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!data.isLoggedIn || data.role !== "ADMIN") {
          router.push("/");
          return;
        }

        setLoading(false);
        fetchUsers();
      } catch {
        router.push("/");
      }
    }

    checkAuth();
  }, [router, fetchUsers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteMessage("");
    setInviteLoading(true);

    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inviteName, email: inviteEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "邀请失败");
        return;
      }

      setInviteMessage("邀请已发送");
      setInviteName("");
      setInviteEmail("");
      fetchUsers();
    } catch {
      setInviteError("网络错误，请稍后再试");
    } finally {
      setInviteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">加载中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-zinc-900 mb-8">家人管理</h1>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="text-left px-6 py-3 text-sm font-medium text-zinc-500">
                    姓名
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-zinc-500">
                    邮箱
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-zinc-500">
                    角色
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-zinc-500">
                    加入时间
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-6 py-4 text-sm text-zinc-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
                          user.role === "ADMIN"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {user.role === "ADMIN" ? "管理员" : "作者"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-sm text-zinc-400"
                    >
                      暂无用户
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invite Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">
            邀请新作者
          </h2>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="inviteName"
                  className="block text-sm font-medium text-zinc-700 mb-1.5"
                >
                  姓名
                </label>
                <input
                  id="inviteName"
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-shadow"
                  placeholder="作者姓名"
                />
              </div>
              <div>
                <label
                  htmlFor="inviteEmail"
                  className="block text-sm font-medium text-zinc-700 mb-1.5"
                >
                  邮箱
                </label>
                <input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-shadow"
                  placeholder="author@email.com"
                />
              </div>
            </div>

            {inviteError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3.5 py-2.5">
                {inviteError}
              </p>
            )}

            {inviteMessage && (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3.5 py-2.5">
                {inviteMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={inviteLoading}
              className="py-2.5 px-6 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {inviteLoading ? "发送中…" : "发送邀请"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
