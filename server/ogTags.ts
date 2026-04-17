import * as db from "./db";
import { generateProviderOgImage } from "./ogImage";

// In-memory cache for generated OG image URLs (slug -> url)
// This avoids regenerating the image on every social crawler visit
const ogImageCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Build OG meta tag HTML for a provider profile page (/p/:slug).
 * Returns empty string if provider not found.
 */
export async function getProviderOgTags(slug: string, origin: string): Promise<string> {
  try {
    console.log(`[OG Tags] Looking up provider with slug: "${slug}"`);
    const provider = await db.getProviderBySlug(slug);
    console.log(`[OG Tags] Provider result:`, provider ? `found: ${provider.businessName}` : "NOT FOUND");
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

    // Generate or retrieve cached OG image
    let imageUrl: string | null = null;
    
    // Check cache first
    const cached = ogImageCache.get(slug);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      imageUrl = cached.url;
      console.log(`[OG Tags] Using cached OG image for "${slug}"`);
    } else {
      // Generate a new OG image
      console.log(`[OG Tags] Generating OG image for "${slug}"...`);
      try {
        imageUrl = await generateProviderOgImage(slug);
        if (imageUrl) {
          ogImageCache.set(slug, { url: imageUrl, timestamp: Date.now() });
          console.log(`[OG Tags] OG image generated and cached for "${slug}"`);
        }
      } catch (err) {
        console.error(`[OG Tags] Failed to generate OG image for "${slug}":`, err);
      }
    }

    // Fallback: use profile photo or OlogyCrew logo
    if (!imageUrl) {
      try {
        const user = await db.getUserById(provider.userId);
        if (user?.profilePhotoUrl) {
          imageUrl = user.profilePhotoUrl;
        }
      } catch { /* ignore */ }
    }
    if (!imageUrl) {
      imageUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png";
    }

    const tags = [
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:type" content="profile" />`,
      `<meta property="og:site_name" content="OlogyCrew" />`,
      `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
      `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
    ];

    return tags.join("\n    ");
  } catch (error) {
    console.error("[OG Tags] Error generating provider OG tags:", error);
    return "";
  }
}

/**
 * Invalidate the cached OG image for a provider (call when profile is updated).
 */
export function invalidateOgImageCache(slug: string): void {
  ogImageCache.delete(slug);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
