import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lezhiweng.com";

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const tags = await prisma.tag.findMany({
    select: { slug: true },
  });

  const authors = await prisma.user.findMany({
    select: { name: true },
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${posts
  .map(
    (post: { slug: string; updatedAt: Date }) => `  <url>
    <loc>${SITE_URL}/posts/${post.slug}</loc>
    <lastmod>${post.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("\n")}
${tags
  .map(
    (tag: { slug: string }) => `  <url>
    <loc>${SITE_URL}/tags/${tag.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`
  )
  .join("\n")}
${authors
  .map(
    (author: { name: string }) => `  <url>
    <loc>${SITE_URL}/author/${encodeURIComponent(author.name)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
