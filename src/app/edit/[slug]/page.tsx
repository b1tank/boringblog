"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

interface UserInfo {
  role: "ADMIN" | "AUTHOR";
}

interface PostData {
  slug: string;
  title: string;
  content: object;
  coverImage: string | null;
  published: boolean;
  pinned: boolean;
  tags: { id: string; name: string; slug: string }[];
  updatedAt: string;
}

export default function EditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: initialSlug } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<object | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [slug, setSlug] = useState(initialSlug);
  const [published, setPublished] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<object | null>(null);
  const currentSlugRef = useRef(initialSlug);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Fetch post data
  useEffect(() => {
    fetch(`/api/posts/${initialSlug}`)
      .then((r) => {
        if (!r.ok) throw new Error("文章不存在");
        return r.json();
      })
      .then((post: PostData) => {
        setTitle(post.title);
        setContent(post.content);
        setCoverImage(post.coverImage || "");
        setPublished(post.published);
        setPinned(post.pinned);
        setSlug(post.slug);
        setTags(post.tags.map((t) => t.name));
        setLastSaved(new Date(post.updatedAt));
        currentSlugRef.current = post.slug;
      })
      .catch(() => router.push("/drafts"))
      .finally(() => setLoading(false));
  }, [initialSlug, router]);

  // Fetch user info
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.role) setUser(d); })
      .catch(() => {});
  }, []);

  const save = useCallback(
    async (pub?: boolean) => {
      if (!title.trim()) {
        titleInputRef.current?.focus();
        alert("请输入标题");
        return;
      }
      if (!contentRef.current) return;
      const targetPublished = pub !== undefined ? pub : published;
      if (targetPublished && tags.length === 0) {
        const shouldContinue = confirm("当前未添加标签，发布后不利于分类和检索。仍要继续发布吗？");
        if (!shouldContinue) return;
      }
      setSaving(true);
      try {
        const body = {
          title,
          content: contentRef.current,
          tags,
          coverImage: coverImage || undefined,
          published: pub !== undefined ? pub : published,
          pinned,
        };

        const res = await fetch(`/api/posts/${currentSlugRef.current}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        currentSlugRef.current = data.slug;
        setSlug(data.slug);
        setLastSaved(new Date());
        if (pub !== undefined) setPublished(data.published);
        if (data.slug !== initialSlug) {
          router.replace(`/edit/${data.slug}`);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "保存失败");
      } finally {
        setSaving(false);
      }
    },
    [title, tags, coverImage, pinned, published, initialSlug, router]
  );

  // Auto-save every 30s
  useEffect(() => {
    if (loading || !title.trim() || !contentRef.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      save();
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [title, content, tags, coverImage, slug, pinned, published, loading, save]);

  const handleDelete = async () => {
    if (!confirm(`确定删除「${title || '无标题'}」吗？此操作不可撤销。`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${currentSlugRef.current}`, { method: "DELETE" });
      if (res.ok) {
        router.push(published ? "/" : "/drafts");
      } else {
        const data = await res.json();
        alert(data.error || "删除失败");
      }
    } catch {
      alert("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(/,/g, "");
      if (t && !tags.includes(t)) setTags([...tags, t]);
      setTagInput("");
    }
  };

  const removeTag = (idx: number) => {
    setTags(tags.filter((_, i) => i !== idx));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.url) setCoverImage(data.url);
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
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
        {/* Main editor area */}
        <div className="flex-1 min-w-0 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-foreground">编辑文章</h1>
            <div className="flex flex-wrap items-center gap-2">
              {lastSaved && (
                <span className="text-xs text-muted">
                  上次保存 {lastSaved.toLocaleTimeString("zh-CN")}
                </span>
              )}
              <button
                onClick={() => save()}
                disabled={saving}
                className="px-4 py-1.5 text-sm rounded border border-border text-foreground hover:bg-tag-bg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? "保存中..." : "更新"}
              </button>
              {!published && (
                <button
                  onClick={() => save(true)}
                  disabled={saving}
                  className="px-4 py-1.5 text-sm rounded bg-accent text-white hover:opacity-90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  发布
                </button>
              )}
              {published && (
                <button
                  onClick={() => save(false)}
                  disabled={saving}
                  className="px-4 py-1.5 text-sm rounded border border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  转为草稿
                </button>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden px-2 py-1.5 text-sm rounded border border-border cursor-pointer"
                title="更多设置"
              >
                ⚙
              </button>
            </div>
          </div>

          <div className="mb-4 p-3 border border-border rounded-lg bg-card space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground" htmlFor="post-title">
                标题 <span className="text-red-500">*</span>
              </label>
              <span className="text-xs px-2 py-0.5 rounded bg-tag-bg text-tag-text">必填</span>
            </div>
            <input
              id="post-title"
              ref={titleInputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入文章标题（必填）"
              className="w-full px-3 py-2 text-lg font-semibold bg-background border border-border rounded outline-none focus:border-accent"
            />
          </div>

          {content && <Editor content={content} onChange={setContent} />}
        </div>

        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? "block" : "hidden"
          } lg:block w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border p-4 space-y-5`}
        >
          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              标签
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-tag-bg text-tag-text"
                >
                  {t}
                  <button
                    onClick={() => removeTag(i)}
                    className="ml-1 text-muted hover:text-foreground cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="输入标签，回车添加"
              className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded outline-none focus:border-accent"
            />
          </div>

          {/* Cover image */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              封面图片
            </label>
            {coverImage && (
              <div className="mb-2 relative">
                <img
                  src={coverImage}
                  alt="封面"
                  className="w-full h-32 object-cover rounded"
                />
                <button
                  onClick={() => setCoverImage("")}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => coverFileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-tag-bg transition-colors cursor-pointer"
            >
              选择图片
            </button>
            <p className="mt-1 text-xs text-muted">支持 JPG、PNG、WebP 格式。</p>
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              文章链接
            </label>
            <input
              type="text"
              value={slug}
              disabled
              className="w-full px-3 py-1.5 text-sm bg-tag-bg border border-border rounded text-muted"
            />
          </div>

          {/* Published toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">当前状态</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                published
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-tag-bg text-tag-text"
              }`}
            >
              {published ? "已发布" : "草稿"}
            </span>
          </div>
          <p className="text-xs text-muted">“转为草稿”后文章会从公开页面下线，但保留内容以便继续编辑。</p>

          {/* Pinned toggle (admin only) */}
          {user?.role === "ADMIN" && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted">置顶</span>
              <button
                onClick={() => setPinned(!pinned)}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                  pinned ? "bg-accent" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    pinned ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          )}

          {/* Delete post */}
          <div className="pt-4 border-t border-border">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full px-3 py-2 text-sm rounded border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {deleting ? "删除中..." : "删除文章"}
            </button>
            <p className="mt-1.5 text-xs text-muted">删除后不可恢复，请谨慎操作。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
