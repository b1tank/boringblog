/**
 * Renders Tiptap HTML output with proper typography and heading IDs for TOC.
 */

function generateHeadingId(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]/g, "");
}

function addHeadingIds(html: string): string {
  return html.replace(
    /<(h[23])([^>]*)>(.*?)<\/h[23]>/gi,
    (_match, tag: string, attrs: string, content: string) => {
      const id = generateHeadingId(content);
      // Preserve existing attributes, add or replace id
      if (/id="/.test(attrs)) {
        return `<${tag}${attrs}>${content}</${tag}>`;
      }
      return `<${tag} id="${id}"${attrs}>${content}</${tag}>`;
    }
  );
}

interface PostContentProps {
  html: string;
}

export function PostContent({ html }: PostContentProps) {
  const processed = addHeadingIds(html);

  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}
