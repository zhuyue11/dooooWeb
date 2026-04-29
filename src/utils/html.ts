/**
 * Strips HTML tags and decodes common HTML entities to produce plain text.
 * Used for previewing rich text descriptions in task lists and calendar rows.
 *
 * Mirrors dooooApp/utils/html.ts — keep in sync.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Detects whether HTML contains rich formatting beyond Quill's default
 * `<p>` wrappers. Plain text typed in the rich editor produces `<p>text</p>`
 * which is effectively plain text — this returns true only when actual
 * formatting tags (bold, italic, links, lists, embeds, etc.) are present.
 *
 * Mirrors dooooApp/utils/html.ts — keep in sync.
 */
export function hasRichFormatting(html: string): boolean {
  const stripped = html
    .replace(/<\/?p>/gi, '')
    .replace(/<br\s*\/?>/gi, '');
  return /<[a-z][\s\S]*>/i.test(stripped);
}

/**
 * Simple check whether a string contains HTML tags.
 * Used to decide between plain text rendering and sanitized HTML rendering.
 */
export function isHtml(text: string): boolean {
  return /<[^>]+>/.test(text);
}
