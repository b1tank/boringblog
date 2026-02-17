import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PostCard } from "@/components/PostCard";
import { Pagination } from "@/components/Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface Props {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const tag = await prisma.tag.findUnique({
    where: { slug: tagSlug },
    select: { name: true },
  });

  if (!tag) return { title: "标签未找到" };

  return {
    title: `标签: ${tag.name}`,
    description: `所有标签为「${tag.name}」的文章`,
  };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { tag: tagSlug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";

  const tag = await prisma.tag.findUnique({
    where: { slug: tagSlug },
    select: { name: true, slug: true },
  });

  if (!tag) notFound();

  const postWhere: Record<string, unknown> = {
    published: true,
    tags: { some: { slug: tagSlug } },
  };
  if (!isAdmin) {
    postWhere.author = { role: { not: "ADMIN" as const } };
  }

  const [posts, totalCount] = await Promise.all([
    prisma.post.findMany({
      where: postWhere,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { name: true } },
        tags: true,
      },
    }),
    prisma.post.count({ where: postWhere }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">
        标签：{tag.name}
        <span className="text-muted text-base font-normal ml-3">
          {totalCount} 篇文章
        </span>
      </h1>

      {posts.length === 0 ? (
        <p className="text-muted text-center py-16">该标签下暂无文章</p>
      ) : (
        <div className="space-y-10">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showAuthor={isAdmin} />
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        buildHref={(p) => `/tags/${tagSlug}${p > 1 ? `?page=${p}` : ""}`}
      />
    </div>
  );
}
