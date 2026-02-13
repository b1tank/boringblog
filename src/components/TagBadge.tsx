import Link from "next/link";

interface TagBadgeProps {
  name: string;
  slug: string;
}

export function TagBadge({ name, slug }: TagBadgeProps) {
  return (
    <Link
      href={`/tags/${slug}`}
      className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-tag-bg text-tag-text hover:text-foreground transition-colors"
    >
      {name}
    </Link>
  );
}
