import * as db from "./db";

/**
 * Build OG meta tag HTML for a provider profile page (/p/:slug).
 * Returns empty string if provider not found.
 */
export async function getProviderOgTags(slug: string, origin: string): Promise<string> {
  try {
    const provider = await db.getProviderBySlug(slug);
    if (!provider) return "";

    const businessName = escapeHtml(provider.businessName || "Provider");
    const title = `${businessName} on OlogyCrew`;
    const url = `${origin}/p/${slug}`;

    // Build description from available data
    const parts: string[] = [];
    if (provider.description) {
      const desc = provider.description.length > 150
        ? provider.description.slice(0, 147) + "..."
        : provider.description;
      parts.push(escapeHtml(desc));
    }
    if (provider.city || provider.state) {
      const location = [provider.city, provider.state].filter(Boolean).join(", ");
      parts.push(escapeHtml(location));
    }
    const description = parts.length > 0
      ? parts.join(" \u2022 ")
      : `Book services from ${businessName} on OlogyCrew`;

    // Try to get the user's profile photo, fallback to OlogyCrew logo
    let image = "https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png";
    try {
      const user = await db.getUserById(provider.userId);
      if (user?.profilePhotoUrl) image = user.profilePhotoUrl;
    } catch { /* fallback to default */ }

    const tags = [
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:type" content="profile" />`,
      `<meta property="og:site_name" content="OlogyCrew" />`,
      `<meta property="og:image" content="${escapeHtml(image)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
      `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    ];

    return tags.join("\n    ");
  } catch (error) {
    console.error("[OG Tags] Error generating provider OG tags:", error);
    return "";
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
