"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import { useCallback, useRef, useState } from "react";

interface EditorProps {
  content: object | null;
  onChange: (json: object) => void;
}

export default function Editor({ content, onChange }: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const editor = useEditor({
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
      Youtube.configure({ inline: false }),
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
    const url = prompt("输入YouTube或Bilibili视频链接");
    if (!url || !editor) return;

    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      editor.commands.setYoutubeVideo({ src: url });
      return;
    }

    // Bilibili
    const biliMatch = url.match(/bilibili\.com\/video\/(BV[\w]+)/);
    if (biliMatch) {
      const bvid = biliMatch[1];
      const iframe = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;"><iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&page=1&autoplay=0" style="position:absolute;top:0;left:0;width:100%;height:100%;" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen></iframe></div>`;
      editor.commands.insertContent(iframe);
      return;
    }

    alert("暂不支持该视频链接格式");
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
          🖼
        </ToolbarBtn>
        <ToolbarBtn active={false} onClick={handleVideoEmbed} title="插入视频">
          ▶
        </ToolbarBtn>
        <ToolbarBtn
          active={false}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
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
          🖼
        </FloatingBtn>
        <FloatingBtn onClick={handleVideoEmbed} title="视频">
          ▶
        </FloatingBtn>
        <FloatingBtn
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
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
          <span className="flex items-center gap-1">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setLink()}
              placeholder="输入链接..."
              className="text-sm px-2 py-0.5 bg-background border border-border rounded w-48 outline-none"
              autoFocus
            />
            <button
              onClick={setLink}
              className="text-xs text-accent hover:underline"
            >
              确定
            </button>
            <button
              onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}
              className="text-xs text-muted hover:underline"
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
      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
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
