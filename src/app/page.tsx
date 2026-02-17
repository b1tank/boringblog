import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PostCard } from "@/components/PostCard";
import { Pagination } from "@/components/Pagination";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const tagFilter = params.tag || null;
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";

  // Base filter: published, optionally filter by tag, hide admin posts for non-admin
  const baseWhere: Record<string, unknown> = { published: true };
  if (tagFilter) {
    baseWhere.tags = { some: { slug: tagFilter } };
  }
  if (!isAdmin) {
    baseWhere.author = { role: { not: "ADMIN" as const } };
  }

  // Fetch all tags with counts (for sidebar)
  const allTags = await prisma.tag.findMany({
    select: {
      name: true,
      slug: true,
      _count: {
        select: {
          posts: {
            where: {
              published: true,
              ...(!isAdmin ? { author: { role: { not: "ADMIN" as const } } } : {}),
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const tagsWithCounts = allTags
    .filter((t) => t._count.posts > 0)
    .map((t) => ({ name: t.name, slug: t.slug, count: t._count.posts }));

  const [pinnedPosts, regularPosts, totalCount] = await Promise.all([
    page === 1 && !tagFilter
      ? prisma.post.findMany({
          where: { ...baseWhere, pinned: true },
          orderBy: { publishedAt: "desc" },
          include: { author: { select: { name: true } }, tags: true },
        })
      : Promise.resolve([]),
    prisma.post.findMany({
      where: {
        ...baseWhere,
        ...(page === 1 && !tagFilter ? { pinned: false } : {}),
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { author: { select: { name: true } }, tags: true },
    }),
    prisma.post.count({ where: baseWhere }),
  ]);

  const posts = page === 1 && !tagFilter ? [...pinnedPosts, ...regularPosts] : regularPosts;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (tagFilter) params.set("tag", tagFilter);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left column: articles */}
      <div className="flex-1 min-w-0">
        {tagFilter && (
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              标签：{tagsWithCounts.find((t) => t.slug === tagFilter)?.name || tagFilter}
            </h2>
            <Link
              href="/"
              className="text-sm text-accent hover:underline"
            >
              查看全部
            </Link>
          </div>
        )}

        {posts.length === 0 ? (
          <p className="text-center text-muted py-20 text-lg">暂无文章</p>
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
          buildHref={buildHref}
        />
      </div>

      {/* Right column: tag sidebar */}
      {tagsWithCounts.length > 0 && (
        <aside className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-20">
            <h3 className="text-sm font-semibold text-muted mb-3">标签</h3>
            <div className="flex flex-wrap gap-2">
              {tagFilter && (
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-accent text-white transition-colors"
                >
                  全部
                </Link>
              )}
              {tagsWithCounts.map((tag) => (
                <Link
                  key={tag.slug}
                  href={tagFilter === tag.slug ? "/" : `/?tag=${tag.slug}`}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                    tagFilter === tag.slug
                      ? "bg-accent text-white"
                      : "bg-tag-bg text-tag-text hover:text-foreground"
                  }`}
                >
                  {tag.name}
                  <span
                    className={`text-[0.65rem] px-1.5 py-0.5 rounded-full ${
                      tagFilter === tag.slug
                        ? "bg-white/20"
                        : "bg-background/60"
                    }`}
                  >
                    {tag.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
