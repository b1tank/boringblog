import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const tag = searchParams.get("tag");
  const author = searchParams.get("author");
  const publishedParam = searchParams.get("published");

  // If requesting drafts, require auth
  if (publishedParam === "false") {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const where: Record<string, unknown> = { published: false };

    // Non-admin can only see their own drafts
    if (session.role !== "ADMIN") {
      where.authorId = session.userId;
    } else if (author) {
      where.author = { name: author };
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true } },
          tags: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({ posts, total, page, limit });
  }

  // Public: list published posts
  const where: Record<string, unknown> = { published: true };

  if (tag) {
    where.tags = { some: { slug: tag } };
  }
  if (author) {
    where.author = { name: author };
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
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
      title: string;
      content: object;
      tags?: string[];
      coverImage?: string;
      published?: boolean;
      pinned?: boolean;
    };

    if (!title || !content) {
      return NextResponse.json(
        { error: "标题和内容不能为空" },
        { status: 400 }
      );
    }

    const slug = generateSlug(title);

    // Check slug uniqueness
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "该链接标识已存在，请修改后重试" },
        { status: 409 }
      );
    }

    const contentHtml = generateHTML(content as Parameters<typeof generateHTML>[0], extensions);

    // Upsert tags
    const tagConnections = tags?.length
      ? await Promise.all(
          tags.map(async (tagName: string) => {
            const trimmed = tagName.trim();
            if (!trimmed) return null;
            const tag = await prisma.tag.upsert({
              where: { name: trimmed },
              create: {
                name: trimmed,
                slug: generateSlug(trimmed),
              },
              update: {},
            });
            return { id: tag.id };
          })
        )
      : [];

    const validTagConnections = tagConnections.filter(
      (t): t is { id: string } => t !== null
    );

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content: content as object,
        contentHtml,
        coverImage: coverImage || null,
        published: published || false,
        pinned: pinned || false,
        publishedAt: published ? new Date() : null,
        authorId: session.userId,
        tags: { connect: validTagConnections },
      },
      include: {
        author: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    logger.error("Create post error", { error: String(error) });
    return NextResponse.json({ error: "创建文章失败" }, { status: 500 });
  }
}
