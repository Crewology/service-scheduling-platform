import { Request, Response } from "express";
import { getProviderOgTags, getServiceOgTags, getCategoryOgTags, getHomepageOgTags } from "./ogTags";

/**
 * Dedicated OG page route: /api/og/:type/:id
 * 
 * Social media crawlers (Facebook, LinkedIn, Twitter/X) need server-rendered OG meta tags
 * in the initial HTML response. The Manus CDN pre-renders SPA pages and replaces any
 * server-injected OG tags with generic platform defaults.
 * 
 * This route bypasses the CDN by serving a minimal HTML page under /api/* (which the CDN
 * passes through to Express). The page contains:
 * - Proper OG + Twitter Card meta tags for the specific entity
 * - A canonical link pointing to the real SPA page
 * - An instant JavaScript redirect for human visitors
 * - A meta refresh fallback for non-JS environments
 * 
 * Share URLs use this format:
 *   /api/og/provider/:slug  → provider profile
 *   /api/og/service/:id     → service detail
 *   /api/og/category/:slug  → category page
 */

const FAVICON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/favicon_a2f41356.ico";

export async function handleOgPage(req: Request, res: Response) {
  const { type, id } = req.params;
  const origin = `${req.protocol}://${req.get("host")}`;

  let ogTags = "";
  let canonicalPath = "/";

  try {
    switch (type) {
      case "provider":
      case "p":
        ogTags = await getProviderOgTags(id, origin);
        canonicalPath = `/p/${id}`;
        break;
      case "service":
        ogTags = await getServiceOgTags(parseInt(id, 10), origin);
        canonicalPath = `/service/${id}`;
        break;
      case "category":
        ogTags = await getCategoryOgTags(id, origin);
        canonicalPath = `/category/${id}`;
        break;
      default:
        ogTags = await getHomepageOgTags(origin);
        canonicalPath = "/";
    }
  } catch (error) {
    console.error(`[OG Page] Error generating OG tags for ${type}/${id}:`, error);
  }

  // If no OG tags found, fall back to homepage tags
  if (!ogTags) {
    try {
      ogTags = await getHomepageOgTags(origin);
    } catch {
      // Last resort: empty tags
    }
  }

  const canonicalUrl = `${origin}${canonicalPath}`;

  // Override the og:url to point to the canonical SPA page (not the /api/og/ URL)
  ogTags = ogTags.replace(
    /(<meta property="og:url" content=")[^"]*(")/,
    `$1${escapeHtml(canonicalUrl)}$2`
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/x-icon" href="${FAVICON_URL}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}" />
  ${ogTags}
  <title>Redirecting to OlogyCrew...</title>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(canonicalUrl)}">${escapeHtml(canonicalUrl)}</a>...</p>
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
</body>
</html>`;

  res.status(200).set({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=300", // Cache for 5 minutes
  }).end(html);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
