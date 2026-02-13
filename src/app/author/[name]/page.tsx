import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PostCard } from "@/components/PostCard";

interface Props {
  params: Promise<{ name: string }>;
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

export default async function AuthorPage({ params }: Props) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const user = await prisma.user.findFirst({
    where: { name: decodedName },
    select: {
      name: true,
      posts: {
        where: { published: true },
        orderBy: { publishedAt: "desc" },
        include: {
          author: { select: { name: true } },
          tags: true,
        },
      },
    },
  });

  if (!user) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">
        {user.name}
        <span className="text-muted text-base font-normal ml-3">
          {user.posts.length} 篇文章
        </span>
      </h1>

      {user.posts.length === 0 ? (
        <p className="text-muted text-center py-16">该作者暂无发表文章</p>
      ) : (
        <div className="space-y-10">
          {user.posts.map((post: typeof user.posts[number]) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
