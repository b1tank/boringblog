import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between text-xs text-muted">
        <span>© {year} 乐之翁</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hover:text-foreground transition-colors py-2 px-2"
          >
            管理
          </Link>
        </div>
      </div>
    </footer>
  );
}
