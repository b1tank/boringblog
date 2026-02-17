import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

export function Pagination({ currentPage, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build page numbers to show: always show first, last, current, and neighbors
  const pages: (number | "ellipsis")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }

  return (
    <nav className="flex justify-center items-center gap-2 mt-12 text-sm" aria-label="分页">
      {currentPage > 1 && (
        <Link
          href={buildHref(currentPage - 1)}
          className="px-3 py-2 rounded text-accent hover:bg-tag-bg transition-colors inline-flex items-center min-h-[44px]"
        >
          ← 上一页
        </Link>
      )}

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="px-2 text-muted">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            className={`px-3 py-2 rounded min-h-[44px] inline-flex items-center transition-colors ${
              p === currentPage
                ? "bg-accent text-white font-medium"
                : "text-muted hover:text-foreground hover:bg-tag-bg"
            }`}
          >
            {p}
          </Link>
        )
      )}

      {currentPage < totalPages && (
        <Link
          href={buildHref(currentPage + 1)}
          className="px-3 py-2 rounded text-accent hover:bg-tag-bg transition-colors inline-flex items-center min-h-[44px]"
        >
          下一页 →
        </Link>
      )}
    </nav>
  );
}
