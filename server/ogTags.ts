import * as db from "./db";
import { generateProviderOgImage, generateServiceOgImage } from "./ogImage";

// In-memory cache for generated OG image URLs (key -> url)
// This avoids regenerating the image on every social crawler visit
const ogImageCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const OLOGYCREW_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png";

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
    let imageUrl = await getCachedOgImage(`provider:${slug}`, () => generateProviderOgImage(slug));

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
      imageUrl = OLOGYCREW_LOGO;
    }

    return buildOgTagsHtml({ title, description, url, imageUrl, type: "profile" });
  } catch (error) {
    console.error("[OG Tags] Error generating provider OG tags:", error);
    return "";
  }
}

/**
 * Build OG meta tag HTML for a service detail page (/service/:id).
 * Returns empty string if service not found.
 */
export async function getServiceOgTags(serviceId: number, origin: string): Promise<string> {
  try {
    console.log(`[OG Tags] Looking up service with id: ${serviceId}`);
    const service = await db.getServiceById(serviceId);
    if (!service) return "";

    const provider = await db.getProviderById(service.providerId);
    const category = await db.getCategoryById(service.categoryId);
    const businessName = provider?.businessName || "Provider";
    const serviceName = service.name || "Service";

    const title = escapeHtml(`${serviceName} — ${businessName} on OlogyCrew`);
    const url = `${origin}/service/${serviceId}`;

    // Build description
    const descParts: string[] = [];
    if (service.description) {
      const desc = service.description.length > 120
        ? service.description.slice(0, 117) + "..."
        : service.description;
      descParts.push(desc);
    }
    // Add price info
    if (service.pricingModel === "fixed" && service.basePrice) {
      descParts.push(`$${parseFloat(service.basePrice).toFixed(0)}`);
    } else if (service.pricingModel === "hourly" && service.hourlyRate) {
      descParts.push(`$${parseFloat(service.hourlyRate).toFixed(0)}/hr`);
    }
    // Add duration
    if (service.durationMinutes) {
      descParts.push(`${service.durationMinutes} min`);
    }
    if (category?.name) {
      descParts.push(category.name);
    }
    const description = escapeHtml(
      descParts.length > 0
        ? descParts.join(" \u2022 ")
        : `Book ${serviceName} from ${businessName} on OlogyCrew`
    );

    // Generate or retrieve cached OG image
    let imageUrl = await getCachedOgImage(`service:${serviceId}`, () => generateServiceOgImage(serviceId));

    if (!imageUrl) {
      imageUrl = OLOGYCREW_LOGO;
    }

    return buildOgTagsHtml({ title, description, url, imageUrl, type: "product" });
  } catch (error) {
    console.error("[OG Tags] Error generating service OG tags:", error);
    return "";
  }
}

/**
 * Build OG meta tag HTML for a category page (/category/:slug).
 * Returns empty string if category not found.
 */
export async function getCategoryOgTags(categorySlug: string, origin: string): Promise<string> {
  try {
    console.log(`[OG Tags] Looking up category with slug: "${categorySlug}"`);
    const category = await db.getCategoryBySlug(categorySlug);
    if (!category) return "";

    const categoryName = escapeHtml(category.name);
    const title = `${categoryName} Services — OlogyCrew`;
    const url = `${origin}/category/${categorySlug}`;
    const description = escapeHtml(
      category.description
        ? category.description.length > 160
          ? category.description.slice(0, 157) + "..."
          : category.description
        : `Browse and book ${category.name} services from trusted professionals on OlogyCrew`
    );

    return buildOgTagsHtml({
      title,
      description,
      url,
      imageUrl: category.iconUrl || OLOGYCREW_LOGO,
      type: "website",
    });
  } catch (error) {
    console.error("[OG Tags] Error generating category OG tags:", error);
    return "";
  }
}

/**
 * Build OG meta tag HTML for the homepage.
 */
export function getHomepageOgTags(origin: string): string {
  const title = "OlogyCrew — Book Trusted Service Professionals";
  const description = "Find and book trusted service professionals for barbering, auto detailing, fitness, photography, home services, and more. Browse categories, compare providers, and schedule appointments instantly.";
  const imageUrl = OLOGYCREW_LOGO;

  return buildOgTagsHtml({
    title,
    description,
    url: origin,
    imageUrl,
    type: "website",
  });
}

/**
 * Invalidate the cached OG image for a provider (call when profile is updated).
 */
export function invalidateOgImageCache(slug: string): void {
  ogImageCache.delete(`provider:${slug}`);
}

/**
 * Invalidate the cached OG image for a service (call when service is updated).
 */
export function invalidateServiceOgImageCache(serviceId: number): void {
  ogImageCache.delete(`service:${serviceId}`);
}

// ---- Internal helpers ----

async function getCachedOgImage(
  cacheKey: string,
  generator: () => Promise<string | null>
): Promise<string | null> {
  const cached = ogImageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[OG Tags] Using cached OG image for "${cacheKey}"`);
    return cached.url;
  }

  console.log(`[OG Tags] Generating OG image for "${cacheKey}"...`);
  try {
    const url = await generator();
    if (url) {
      ogImageCache.set(cacheKey, { url, timestamp: Date.now() });
      console.log(`[OG Tags] OG image generated and cached for "${cacheKey}"`);
    }
    return url;
  } catch (err) {
    console.error(`[OG Tags] Failed to generate OG image for "${cacheKey}":`, err);
    return null;
  }
}

function buildOgTagsHtml(opts: {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  type: string;
}): string {
  const tags = [
    `<meta property="og:title" content="${opts.title}" />`,
    `<meta property="og:description" content="${opts.description}" />`,
    `<meta property="og:url" content="${opts.url}" />`,
    `<meta property="og:type" content="${opts.type}" />`,
    `<meta property="og:site_name" content="OlogyCrew" />`,
    `<meta property="og:image" content="${escapeHtml(opts.imageUrl)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${opts.title}" />`,
    `<meta name="twitter:description" content="${opts.description}" />`,
    `<meta name="twitter:image" content="${escapeHtml(opts.imageUrl)}" />`,
  ];
  return tags.join("\n    ");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
