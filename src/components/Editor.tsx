"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import VideoEmbed from "@/lib/editor/videoEmbed";
import { useCallback, useRef, useState } from "react";

interface EditorProps {
  content: object | null;
  onChange: (json: object) => void;
}

const VIDEO_HOST_HINTS = [
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "dailymotion.com",
  "twitch.tv",
  "bilibili.com",
  "x.com",
  "twitter.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "loom.com",
  "wistia.com",
  "rutube.ru",
];

function isLikelyEmbeddableVideoUrl(parsedUrl: URL): boolean {
  const host = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();
  const path = `${parsedUrl.pathname}${parsedUrl.search}`.toLowerCase();

  if (VIDEO_HOST_HINTS.some((hint) => host.includes(hint))) {
    return true;
  }

  return /(watch|video|embed|player|shorts|clip|live|reel)\b/.test(path);
}

export default function Editor({ content, onChange }: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({ allowBase64: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "开始写作..." }),
      Link.configure({
        autolink: true,
        openOnClick: false,
        HTMLAttributes: { class: "text-accent underline" },
      }),
      VideoEmbed,
    ],
    content: content || undefined,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "prose max-w-none min-h-[500px] outline-none px-4 py-3",
      },
    },
  });

  const uploadImage = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url && editor) {
        editor.chain().focus().setImage({ src: data.url }).run();
      }
    } catch (err) {
      console.error("图片上传失败:", err);
    }
  }, [editor]);

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadImage(file);
      e.target.value = "";
    },
    [uploadImage]
  );

  const handleVideoEmbed = useCallback(() => {
    const rawUrl = prompt("输入视频链接");
    if (!rawUrl || !editor) return;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl.trim());
    } catch {
      alert("链接格式无效");
      return;
    }

    const isDirectVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(parsedUrl.pathname + parsedUrl.search);
    if (!/^https?:$/.test(parsedUrl.protocol)) {
      alert("仅支持 http 或 https 链接");
      return;
    }

    if (!isDirectVideo && !isLikelyEmbeddableVideoUrl(parsedUrl)) {
      const shouldContinue = confirm("该链接看起来不像可嵌入的视频链接，仍要插入吗？");
      if (!shouldContinue) return;
    }

    editor
      .chain()
      .focus()
      .setVideoEmbed({ src: parsedUrl.toString(), direct: isDirectVideo })
      .run();
  }, [editor]);

  const handleInsertTable = useCallback(() => {
    if (!editor) return;

    const input = prompt("输入表格尺寸，格式：行x列（例如 4x5）", "3x3");
    if (!input) return;

    const normalized = input.trim().toLowerCase();
    const match = normalized.match(/^(\d+)\s*[x×,，]\s*(\d+)$/);
    if (!match) {
      alert("格式错误，请使用例如 3x3 或 3,3");
      return;
    }

    const rows = Number(match[1]);
    const cols = Number(match[2]);

    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 20 || cols > 20) {
      alert("行列数需在 1 到 20 之间");
      return;
    }

    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-lg bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-border">
        <ToolbarBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="粗体"
        >
          B
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="斜体"
        >
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="标题1"
        >
          H1
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="标题2"
        >
          H2
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="标题3"
        >
          H3
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="引用"
        >
          &ldquo;
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="无序列表"
        >
          •
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="有序列表"
        >
          1.
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="代码块"
        >
          {"</>"}
        </ToolbarBtn>
        <ToolbarBtn active={false} onClick={handleImageClick} title="插入图片">
          <ImageIcon />
        </ToolbarBtn>
        <ToolbarBtn active={false} onClick={handleVideoEmbed} title="插入视频">
          <VideoIcon />
        </ToolbarBtn>
        <ToolbarBtn
          active={false}
          onClick={handleInsertTable}
          title="插入表格"
        >
          ⊞
        </ToolbarBtn>
        <ToolbarBtn
          active={false}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="撤销"
        >
          ↩
        </ToolbarBtn>
        <ToolbarBtn
          active={false}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="重做"
        >
          ↪
        </ToolbarBtn>
      </div>

      {/* Floating menu on empty paragraphs */}
      <FloatingMenu
        editor={editor}
        className="flex gap-1 bg-card border border-border rounded-lg p-1 shadow-lg"
      >
        <FloatingBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="标题"
        >
          H
        </FloatingBtn>
        <FloatingBtn onClick={handleImageClick} title="图片">
          <ImageIcon />
        </FloatingBtn>
        <FloatingBtn onClick={handleVideoEmbed} title="视频">
          <VideoIcon />
        </FloatingBtn>
        <FloatingBtn
          onClick={handleInsertTable}
          title="表格"
        >
          ⊞
        </FloatingBtn>
        <FloatingBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="分割线"
        >
          ―
        </FloatingBtn>
      </FloatingMenu>

      {/* Bubble menu on text selection */}
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-lg"
      >
        <FloatingBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="粗体"
          active={editor.isActive("bold")}
        >
          B
        </FloatingBtn>
        <FloatingBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="斜体"
          active={editor.isActive("italic")}
        >
          <em>I</em>
        </FloatingBtn>
        <FloatingBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="标题"
          active={editor.isActive("heading")}
        >
          H
        </FloatingBtn>
        {showLinkInput ? (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setLink()}
              placeholder="输入链接..."
              className="text-sm px-2 py-0.5 bg-background border border-border rounded w-56 outline-none"
              autoFocus
            />
            <button
              onClick={setLink}
              className="inline-flex items-center text-xs text-accent hover:underline whitespace-nowrap"
            >
              确定
            </button>
            <button
              onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}
              className="inline-flex items-center text-xs text-muted hover:underline whitespace-nowrap"
            >
              取消
            </button>
          </span>
        ) : (
          <FloatingBtn
            onClick={() => {
              const existing = editor.getAttributes("link").href || "";
              setLinkUrl(existing);
              setShowLinkInput(true);
            }}
            title="链接"
            active={editor.isActive("link")}
          >
            🔗
          </FloatingBtn>
        )}
      </BubbleMenu>

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

function ToolbarBtn({
  children,
  active,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2.5 py-2 sm:px-2 sm:py-1 rounded text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-white"
          : "text-foreground hover:bg-tag-bg"
      } ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

function FloatingBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-sm transition-colors cursor-pointer ${
        active
          ? "bg-accent text-white"
          : "text-foreground hover:bg-tag-bg"
      }`}
    >
      {children}
    </button>
  );
}

function ImageIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 16-4.8-4.8a1.5 1.5 0 0 0-2.1 0L7 18.2" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
