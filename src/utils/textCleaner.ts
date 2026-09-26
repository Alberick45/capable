/**
 * Decodes HTML entities (including double-escaped ones) and strips HTML tags cleanly.
 */
export function cleanHtmlAndEntities(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Pass 1 & 2: Decode HTML entities
  for (let i = 0; i < 2; i++) {
    cleaned = cleaned
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  }

  // Strip XML/HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');

  // Collapse excess whitespace, line breaks, and non-breaking spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}
