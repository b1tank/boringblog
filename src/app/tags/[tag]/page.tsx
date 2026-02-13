import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PostCard } from "@/components/PostCard";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ tag: string }>;
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

export default async function TagPage({ params }: Props) {
  const { tag: tagSlug } = await params;

  const tag = await prisma.tag.findUnique({
    where: { slug: tagSlug },
    include: {
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

  if (!tag) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">
        标签：{tag.name}
        <span className="text-muted text-base font-normal ml-3">
          {tag.posts.length} 篇文章
        </span>
      </h1>

      {tag.posts.length === 0 ? (
        <p className="text-muted text-center py-16">该标签下暂无文章</p>
      ) : (
        <div className="space-y-10">
          {tag.posts.map((post: typeof tag.posts[number]) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
