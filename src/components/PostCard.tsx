import Link from "next/link";
import Image from "next/image";
import { TagBadge } from "@/components/TagBadge";
import { extractExcerpt } from "@/lib/utils";

interface PostCardProps {
  post: {
    title: string;
    slug: string;
    publishedAt: Date | null;
    coverImage: string | null;
    contentHtml: string;
    pinned: boolean;
    author: { name: string };
    tags: { id: string; name: string; slug: string }[];
  };
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function PostCard({ post }: PostCardProps) {
  const excerpt = extractExcerpt(post.contentHtml, 150);

  return (
    <article className="group">
      <Link href={`/posts/${post.slug}`} className="block">
        {post.coverImage && (
          <div className="relative w-full aspect-[2/1] mb-4 rounded-lg overflow-hidden">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 48rem"
            />
          </div>
        )}

        <h2 className="text-xl font-bold text-foreground group-hover:text-accent transition-colors leading-snug">
          {post.pinned && (
            <span className="text-accent text-sm font-normal mr-2">置顶</span>
          )}
          {post.title}
        </h2>
      </Link>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted">
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
      </div>

      {excerpt && (
        <p className="mt-3 text-muted leading-relaxed text-[0.9375rem]">
          {excerpt}
        </p>
      )}

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {post.tags.map((tag) => (
            <TagBadge key={tag.id} name={tag.name} slug={tag.slug} />
          ))}
        </div>
      )}
    </article>
  );
}
