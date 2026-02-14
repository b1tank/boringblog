import { prisma } from "@/lib/db";
import { PostCard } from "@/components/PostCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const [pinnedPosts, regularPosts, totalCount] = await Promise.all([
    page === 1
      ? prisma.post.findMany({
          where: { published: true, pinned: true },
          orderBy: { publishedAt: "desc" },
          include: { author: { select: { name: true } }, tags: true },
        })
      : Promise.resolve([]),
    prisma.post.findMany({
      where: { published: true, pinned: page === 1 ? false : undefined },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { author: { select: { name: true } }, tags: true },
    }),
    prisma.post.count({ where: { published: true } }),
  ]);

  const posts = page === 1 ? [...pinnedPosts, ...regularPosts] : regularPosts;
  const hasMore = page * PAGE_SIZE < totalCount;

  return (
    <div>
      {posts.length === 0 ? (
        <p className="text-center text-muted py-20 text-lg">暂无文章</p>
      ) : (
        <div className="space-y-10">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {(page > 1 || hasMore) && (
        <nav className="flex justify-center items-center gap-6 mt-16 text-sm">
          {page > 1 && (
            <Link
              href={`/?page=${page - 1}`}
              className="text-accent hover:underline inline-flex items-center min-h-[44px] px-2"
            >
              ← 上一页
            </Link>
          )}
          <span className="text-muted">第 {page} 页</span>
          {hasMore && (
            <Link
              href={`/?page=${page + 1}`}
              className="text-accent hover:underline inline-flex items-center min-h-[44px] px-2"
            >
              加载更多 →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
