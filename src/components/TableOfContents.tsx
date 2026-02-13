"use client";

import { useMemo } from "react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

function parseHeadings(html: string): Heading[] {
  const regex = /<h([23])\s[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[23]>/gi;
  const headings: Heading[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[3].replace(/<[^>]*>/g, "").trim();
    headings.push({
      level: parseInt(match[1], 10),
      id: match[2],
      text,
    });
  }
  return headings;
}

interface TableOfContentsProps {
  html: string;
}

export function TableOfContents({ html }: TableOfContentsProps) {
  const headings = useMemo(() => parseHeadings(html), [html]);

  if (headings.length < 2) return null;

  return (
    <nav className="sticky top-24" aria-label="目录">
      <h4 className="text-sm font-bold text-foreground mb-3">目录</h4>
      <ul className="space-y-1.5 text-sm border-l border-border pl-3">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? "ml-3" : ""}>
            <a
              href={`#${h.id}`}
              className="text-muted hover:text-accent transition-colors block leading-snug"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
