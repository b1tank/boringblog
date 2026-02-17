import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PostCard } from "@/components/PostCard";
import { Pagination } from "@/components/Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface Props {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const user = await prisma.user.findFirst({
    where: { name: decodedName },
    select: { name: true },
  });

  if (!user) return { title: "作者未找到" };

  return {
    title: `${user.name} 的文章`,
    description: `${user.name} 发表的所有文章`,
  };
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const { name } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const decodedName = decodeURIComponent(name);
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";

  const user = await prisma.user.findFirst({
    where: { name: decodedName },
    select: { name: true, role: true },
  });

  if (!user) notFound();

  // Non-admin users can't see admin author pages
  if (user.role === "ADMIN" && !isAdmin) notFound();

  const postWhere = {
    published: true,
    author: { name: decodedName },
  };

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
        {user.name}
        <span className="text-muted text-base font-normal ml-3">
          {totalCount} 篇文章
        </span>
      </h1>

      {posts.length === 0 ? (
        <p className="text-muted text-center py-16">该作者暂无发表文章</p>
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
        buildHref={(p) => `/author/${encodeURIComponent(decodedName)}${p > 1 ? `?page=${p}` : ""}`}
      />
    </div>
  );
}
