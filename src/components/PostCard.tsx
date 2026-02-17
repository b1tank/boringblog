import Link from "next/link";
import Image from "next/image";
import { TagBadge } from "@/components/TagBadge";
import { extractExcerpt, calculateReadingTime } from "@/lib/utils";

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
  showAuthor?: boolean;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function PostCard({ post, showAuthor = false }: PostCardProps) {
  const excerpt = extractExcerpt(post.contentHtml, 150);
  const readingTime = calculateReadingTime(post.contentHtml);

  return (
    <article className="group">
      <div className={`flex flex-col ${post.coverImage ? "sm:flex-row sm:gap-5" : ""}`}>
        {/* Cover image */}
        {post.coverImage && (
          <Link
            href={`/posts/${post.slug}`}
            className="shrink-0 block sm:w-48 md:w-56 mb-3 sm:mb-0"
          >
            <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, 224px"
              />
            </div>
          </Link>
        )}

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <Link href={`/posts/${post.slug}`} className="block">
            <h2 className="text-lg font-bold text-foreground group-hover:text-accent transition-colors leading-snug">
              {post.pinned && (
                <span className="text-accent text-sm font-normal mr-2">置顶</span>
              )}
              {post.title}
            </h2>
          </Link>

          {/* Meta row: author (if admin), date, reading time */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-sm text-muted">
            {showAuthor && (
              <>
                <Link
                  href={`/author/${encodeURIComponent(post.author.name)}`}
                  className="hover:text-foreground transition-colors"
                >
                  {post.author.name}
                </Link>
                <span>·</span>
              </>
            )}
            {post.publishedAt && (
              <time dateTime={new Date(post.publishedAt).toISOString()}>
                {formatDate(post.publishedAt)}
              </time>
            )}
            {readingTime > 0 && (
              <>
                <span>·</span>
                <span>{readingTime} 分钟阅读</span>
              </>
            )}
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.tags.map((tag) => (
                <TagBadge key={tag.id} name={tag.name} slug={tag.slug} />
              ))}
            </div>
          )}

          {/* Excerpt */}
          {excerpt && (
            <p className="mt-2 text-muted leading-relaxed text-[0.875rem] line-clamp-2">
              {excerpt}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
