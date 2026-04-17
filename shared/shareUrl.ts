/**
 * Generate share URLs that route through /api/og/ for proper social media previews.
 * 
 * The Manus CDN pre-renders SPA pages and replaces server-injected OG tags with
 * generic platform defaults. The /api/og/ route bypasses this by serving a minimal
 * HTML page with correct OG tags, then instantly redirecting human visitors to the
 * actual SPA page.
 * 
 * Usage:
 *   getShareUrl("provider", "chisolm-audio", origin)
 *   → "https://servsched-qd7ehrqo.manus.space/api/og/provider/chisolm-audio"
 */

export type ShareEntityType = "provider" | "service" | "category";

/**
 * Build a share URL that goes through the /api/og route for proper OG tag rendering.
 * @param type - Entity type: "provider", "service", or "category"
 * @param id - Entity identifier (slug for provider/category, numeric id for service)
 * @param origin - The window.location.origin (e.g., "https://servsched-qd7ehrqo.manus.space")
 */
export function getShareUrl(type: ShareEntityType, id: string | number, origin: string): string {
  return `${origin}/api/og/${type}/${id}`;
}

/**
 * Get the canonical (human-facing) URL for an entity.
 * This is the actual SPA page URL that users see after the redirect.
 */
export function getCanonicalUrl(type: ShareEntityType, id: string | number, origin: string): string {
  switch (type) {
    case "provider":
      return `${origin}/p/${id}`;
    case "service":
      return `${origin}/service/${id}`;
    case "category":
      return `${origin}/category/${id}`;
    default:
      return origin;
  }
}
