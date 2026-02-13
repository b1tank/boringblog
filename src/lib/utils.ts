import pinyin from "pinyin";
import crypto from "crypto";

/**
 * Generate a URL-friendly slug from a title.
 * Converts Chinese characters to pinyin, strips non-alphanumeric chars,
 * and appends a short random suffix for uniqueness.
 */
export function generateSlug(title: string): string {
  const pinyinResult = pinyin(title, {
    style: pinyin.STYLE_NORMAL,
    heteronym: false,
  });

  const base = pinyinResult
    .map((item: string[]) => item[0])
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}

/**
 * Estimate reading time in minutes.
 * Uses ~400 characters per minute for Chinese text.
 */
export function calculateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "").trim();
  // Count Chinese characters + word-split for non-Chinese
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const nonChinese = text.replace(/[\u4e00-\u9fff]/g, " ").trim();
  const wordCount = nonChinese ? nonChinese.split(/\s+/).filter(Boolean).length : 0;

  const totalUnits = chineseChars + wordCount;
  const minutes = Math.ceil(totalUnits / 400);
  return Math.max(1, minutes);
}

/**
 * Extract a plain-text excerpt from HTML content.
 */
export function extractExcerpt(html: string, maxLength: number = 200): string {
  const text = html.replace(/<[^>]*>/g, "").trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Generate a secure random token for password reset.
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
