const TRAILING_BACKTICK = /(?:%60|`)$/i;

/**
 * Removes a trailing Markdown backtick accidentally copied into a prototype URL.
 * Returns null for every non-prototype URL so ordinary application routes are untouched.
 */
export function normalizePrototypeReviewUrl(originalUrl: string): string | null {
  const queryStart = originalUrl.indexOf("?");
  const rawPath = queryStart >= 0 ? originalUrl.slice(0, queryStart) : originalUrl;
  const rawQuery = queryStart >= 0 ? originalUrl.slice(queryStart) : "";

  if (!rawPath.startsWith("/preview/") || !TRAILING_BACKTICK.test(rawPath)) {
    return null;
  }

  return `${rawPath.replace(TRAILING_BACKTICK, "")}${rawQuery}`;
}

