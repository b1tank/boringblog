import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { prisma } from "@/lib/db";
import { SessionData, sessionOptions } from "@/lib/auth";
import { calculateReadingTime, extractExcerpt } from "@/lib/utils";
import { PostContent } from "@/components/PostContent";
import { TableOfContents } from "@/components/TableOfContents";
import { TagBadge } from "@/components/TagBadge";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

function addHeadingIds(html: string): string {
  return html.replace(
    /<(h[23])([^>]*)>(.*?)<\/h[23]>/gi,
    (_match, tag: string, attrs: string, content: string) => {
      const text = content.replace(/<[^>]*>/g, "").trim();
      const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u4e00-\u9fff-]/g, "");
      if (/id="/.test(attrs)) return `<${tag}${attrs}>${content}</${tag}>`;
      return `<${tag} id="${id}"${attrs}>${content}</${tag}>`;
    }
  );
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

async function getSession() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    return session.isLoggedIn ? session : null;
  } catch {
    return null;
  }
}

async function getPost(slug: string, session: SessionData | null) {
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true } },
      tags: true,
    },
  });

  if (!post) return null;

  // If not published, only author or admin can see
  if (!post.published) {
    if (!session) return null;
    if (session.role !== "ADMIN" && session.userId !== post.authorId) return null;
  }

  return post;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { title: true, contentHtml: true, coverImage: true },
  });

  if (!post) return { title: "文章未找到" };

  const description = extractExcerpt(post.contentHtml, 160);

  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      ...(post.coverImage ? { images: [{ url: post.coverImage }] } : {}),
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();
  const post = await getPost(slug, session);

  if (!post) notFound();

  const readingTime = calculateReadingTime(post.contentHtml);
  const processedHtml = addHeadingIds(post.contentHtml);
  const canEdit =
    session &&
    (session.role === "ADMIN" || session.userId === post.authorId);

  return (
    <div className="max-w-4xl mx-auto">
    <div className="flex gap-10">
      {/* Main content */}
      <article className="flex-1 min-w-0">
        {/* Meta */}
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold leading-snug mb-4">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <Link
              href={`/author/${encodeURIComponent(post.author.name)}`}
              className="hover:text-foreground transition-colors"
            >
              {post.author.name}
            </Link>
            {post.publishedAt && (
              <>
                <span>·</span>
                <time dateTime={new Date(post.publishedAt).toISOString()}>
                  {formatDate(post.publishedAt)}
                </time>
              </>
            )}
            <span>·</span>
            <span>{readingTime} 分钟阅读</span>
            {canEdit && (
              <>
                <span>·</span>
                <Link
                  href={`/edit/${post.slug}`}
                  className="text-accent hover:underline"
                >
                  编辑
                </Link>
              </>
            )}
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag: { id: string; name: string; slug: string }) => (
                <TagBadge key={tag.id} name={tag.name} slug={tag.slug} />
              ))}
            </div>
          )}

          {!post.published && (
            <div className="mt-4 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-1.5 rounded-md inline-block">
              草稿 — 仅作者及管理员可见
            </div>
          )}
        </header>

        {/* Article body */}
        <PostContent html={processedHtml} />
      </article>

      {/* Sidebar TOC (desktop only) */}
      <aside className="hidden lg:block w-56 shrink-0">
        <TableOfContents html={processedHtml} />
      </aside>
    </div>
    </div>
  );
}
