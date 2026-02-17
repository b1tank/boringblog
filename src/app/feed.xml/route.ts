import { prisma } from "@/lib/db";
import { extractExcerpt } from "@/lib/utils";

export const dynamic = "force-dynamic";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRFC822(date: Date): string {
  return date.toUTCString();
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

  const posts = await prisma.post.findMany({
    where: {
      published: true,
      author: { role: { not: "ADMIN" } },
    },
    orderBy: { publishedAt: "desc" },
    take: 20,
    select: {
      title: true,
      slug: true,
      contentHtml: true,
      publishedAt: true,
      author: { select: { name: true } },
    },
  });

  const items = posts
    .map((post: typeof posts[number]) => {
      const description = extractExcerpt(post.contentHtml, 300);
      const link = `${siteUrl}/posts/${post.slug}`;
      const pubDate = post.publishedAt ? toRFC822(new Date(post.publishedAt)) : "";

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <description>${escapeXml(description)}</description>
      <author>${escapeXml(post.author.name)}</author>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
    </item>`;
    })
    .join("\n");

  const lastBuildDate =
    posts.length > 0 && posts[0].publishedAt
      ? toRFC822(new Date(posts[0].publishedAt))
      : toRFC822(new Date());

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>乐之翁</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>个人博客</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(siteUrl)}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
