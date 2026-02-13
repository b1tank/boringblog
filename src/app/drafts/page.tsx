"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface UserInfo {
  role: "ADMIN" | "AUTHOR";
  name: string;
}

interface DraftPost {
  id: string;
  title: string;
  slug: string;
  contentHtml: string;
  updatedAt: string;
  author: { id: string; name: string };
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.role) setUser(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/posts?published=false&limit=100")
      .then((r) => r.json())
      .then((data) => setDrafts(data.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (slug: string, title: string) => {
    if (!confirm(`确定删除「${title}」吗？此操作不可撤销。`)) return;
    setDeleting(slug);
    try {
      const res = await fetch(`/api/posts/${slug}`, { method: "DELETE" });
      if (res.ok) {
        setDrafts(drafts.filter((d) => d.slug !== slug));
      } else {
        const data = await res.json();
        alert(data.error || "删除失败");
      }
    } catch {
      alert("删除失败");
    } finally {
      setDeleting(null);
    }
  };

  const wordCount = (html: string) => {
    const text = html.replace(/<[^>]*>/g, "").trim();
    const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const other = text.replace(/[\u4e00-\u9fff]/g, " ").trim();
    const words = other ? other.split(/\s+/).filter(Boolean).length : 0;
    return chinese + words;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        加载中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">草稿箱</h1>
          <Link
            href="/write"
            className="px-4 py-1.5 text-sm rounded bg-accent text-white hover:opacity-90 transition-colors"
          >
            写文章
          </Link>
        </div>

        {drafts.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="text-lg">暂无草稿</p>
            <p className="mt-2 text-sm">
              <Link href="/write" className="text-accent hover:underline">
                开始写作
              </Link>
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-code-bg text-sm text-muted">
                  <th className="text-left px-4 py-3 font-medium">标题</th>
                  {user?.role === "ADMIN" && (
                    <th className="text-left px-4 py-3 font-medium">作者</th>
                  )}
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                    字数
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                    更新时间
                  </th>
                  <th className="text-right px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {drafts.map((draft) => (
                  <tr
                    key={draft.id}
                    className="hover:bg-code-bg/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/edit/${draft.slug}`}
                        className="text-foreground hover:text-accent transition-colors font-medium"
                      >
                        {draft.title || "无标题"}
                      </Link>
                    </td>
                    {user?.role === "ADMIN" && (
                      <td className="px-4 py-3 text-sm text-muted">
                        {draft.author.name}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-muted hidden sm:table-cell">
                      {wordCount(draft.contentHtml).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted hidden sm:table-cell">
                      {new Date(draft.updatedAt).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/edit/${draft.slug}`}
                          className="text-sm text-accent hover:underline"
                        >
                          编辑
                        </Link>
                        <button
                          onClick={() =>
                            handleDelete(draft.slug, draft.title)
                          }
                          disabled={deleting === draft.slug}
                          className="text-sm text-red-500 hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          {deleting === draft.slug ? "删除中..." : "删除"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
