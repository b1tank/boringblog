import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/utils";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Link from "@tiptap/extension-link";
import VideoEmbed from "@/lib/editor/videoEmbed";

const extensions = [
  StarterKit,
  Image,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  Link,
  VideoEmbed,
];

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true } },
      tags: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  // Published posts are public
  if (post.published) {
    return NextResponse.json(post);
  }

  // Drafts require auth — only author or admin
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (
    !session.isLoggedIn ||
    (session.userId !== post.authorId && session.role !== "ADMIN")
  ) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const post = await prisma.post.findUnique({
    where: { slug },
    include: { tags: true },
  });

  if (!post) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  if (session.userId !== post.authorId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权编辑此文章" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      title,
      content,
      tags,
      coverImage,
      published,
      pinned,
    } = body as {
      title?: string;
      content?: object;
      tags?: string[];
      coverImage?: string;
      published?: boolean;
      pinned?: boolean;
    };

    const data: Record<string, unknown> = {};

    if (title !== undefined) data.title = title;
    if (coverImage !== undefined) data.coverImage = coverImage || null;
    if (pinned !== undefined) data.pinned = pinned;

    // Regenerate HTML if content changed
    if (content) {
      data.content = content;
      data.contentHtml = generateHTML(
        content as Parameters<typeof generateHTML>[0],
        extensions
      );
    }

    // Handle publish state
    if (published !== undefined) {
      data.published = published;
      if (published && !post.published) {
        data.publishedAt = new Date();
      }
    }

    // Handle tag changes
    if (tags !== undefined) {
      // Disconnect all existing tags
      data.tags = {
        set: [], // disconnect all
        connectOrCreate: tags
          .map((t: string) => t.trim())
          .filter(Boolean)
          .map((tagName: string) => ({
            where: { name: tagName },
            create: {
              name: tagName,
              slug: generateSlug(tagName),
            },
          })),
      };
    }

    const updated = await prisma.post.update({
      where: { slug },
      data,
      include: {
        author: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update post error:", error);
    return NextResponse.json({ error: "更新文章失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const post = await prisma.post.findUnique({ where: { slug } });

  if (!post) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  if (session.userId !== post.authorId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权删除此文章" }, { status: 403 });
  }

  await prisma.post.delete({ where: { slug } });

  return NextResponse.json({ success: true });
}
