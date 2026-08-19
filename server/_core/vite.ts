import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { getProviderOgTags, getServiceOgTags, getCategoryOgTags, getHomepageOgTags } from "../ogTags";
import { getProviderJsonLd, getHomepageJsonLd } from "../structuredData";

async function injectOgTags(url: string, template: string, origin: string): Promise<string> {
  let ogTags = "";
  let jsonLd = "";

  // Provider profile pages (/p/:slug)
  const providerMatch = url.match(/^\/p\/([^/?#]+)/);
  if (providerMatch) {
    ogTags = await getProviderOgTags(providerMatch[1], origin);
    jsonLd = await getProviderJsonLd(providerMatch[1], origin);
  }

  // Clean provider profile URLs (/:slug) — check after /p/ but before other routes
  if (!ogTags) {
    const cleanSlugMatch = url.match(/^\/([a-z0-9][a-z0-9-]*[a-z0-9])(?:[/?#]|$)/);
    if (cleanSlugMatch) {
      // Only treat as provider slug if it's not a known app route
      const knownRoutes = ['login','signup','forgot-password','reset-password','verify-email','select-role','browse','featured','search','category','provider','service','booking','bulk-booking','monthly-planner','my-bookings','messages','dm','admin','my-reviews','profile','account','notifications','notification-settings','unsubscribe','embed','receipts','referrals','saved-providers','my-quotes','my-waitlist','pricing','customer','analytics','privacy','terms','help','referral-program','404','experiences'];
      const slug = cleanSlugMatch[1];
      if (!knownRoutes.includes(slug) && !slug.startsWith('p/')) {
        ogTags = await getProviderOgTags(slug, origin);
          jsonLd = await getProviderJsonLd(slug, origin);
      }
    }
  }

  // Service detail pages (/service/:id)
  if (!ogTags) {
    const serviceMatch = url.match(/^\/service\/(\d+)/);
    if (serviceMatch) {
      ogTags = await getServiceOgTags(parseInt(serviceMatch[1], 10), origin);
    }
  }

  // Category pages (/category/:slug)
  if (!ogTags) {
    const categoryMatch = url.match(/^\/category\/([^/?#]+)/);
    if (categoryMatch) {
      ogTags = await getCategoryOgTags(categoryMatch[1], origin);
    }
  }

  // Embed widget pages (/embed/provider/:id) - reuse provider OG tags
  if (!ogTags) {
    const embedProviderMatch = url.match(/^\/embed\/provider\/(\d+)/);
    if (embedProviderMatch) {
      // Look up the provider's slug by ID to get their OG tags
      try {
        const { getProviderById } = await import("../db");
        const provider = await getProviderById(parseInt(embedProviderMatch[1], 10));
        if (provider?.profileSlug) {
          ogTags = await getProviderOgTags(provider.profileSlug, origin);
        } else if (provider) {
          // Fallback: build basic OG tags for the provider
          const businessName = provider.businessName || "Service Provider";
          ogTags = [
            `<meta property="og:title" content="Book Services from ${businessName} on OlogyCrew" />`,
            `<meta property="og:description" content="Browse and book services from ${businessName}. Choose a service, pick a time, and book instantly." />`,
            `<meta property="og:url" content="${origin}/embed/provider/${embedProviderMatch[1]}" />`,
            `<meta property="og:type" content="website" />`,
            `<meta property="og:site_name" content="OlogyCrew" />`,
            `<meta name="twitter:card" content="summary_large_image" />`,
            `<meta name="twitter:title" content="Book Services from ${businessName} on OlogyCrew" />`,
            `<meta name="twitter:description" content="Browse and book services from ${businessName}. Choose a service, pick a time, and book instantly." />`,
            `<meta property="og:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png" />`,
            `<meta name="twitter:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png" />`,
          ].join("\n    ");
        }
      } catch (e) {
        console.error("[OG Tags] Error generating embed provider OG tags:", e);
      }
    }
  }

  // Referral program page
  if (!ogTags && url.startsWith("/referral-program")) {
    ogTags = [
      `<meta property="og:title" content="OlogyCrew Referral Program \u2014 Share & Earn Rewards" />`,
      `<meta property="og:description" content="Refer friends to OlogyCrew and earn credits toward your next booking. Unlock Bronze, Silver, Gold, and Platinum tiers with escalating rewards up to 25%." />`,
      `<meta property="og:url" content="${origin}/referral-program" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="OlogyCrew" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="OlogyCrew Referral Program \u2014 Share & Earn Rewards" />`,
      `<meta name="twitter:description" content="Refer friends to OlogyCrew and earn credits toward your next booking. Unlock Bronze, Silver, Gold, and Platinum tiers with escalating rewards up to 25%." />`,
      `<meta property="og:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/ologycrew-referral-og-compressed_d69712f3.jpg" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta name="twitter:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/ologycrew-referral-og-compressed_d69712f3.jpg" />`,
    ].join("\n    ");
  }

  // Provider onboarding referral page (/provider/onboarding?ref=...)
  if (!ogTags && url.startsWith("/provider/onboarding")) {
    ogTags = [
      `<meta property="og:title" content="Build Your Digital Home on OlogyCrew" />`,
      `<meta property="og:description" content="Your business deserves a digital home. Get discovered, get booked, get paid — no gatekeeping, no lead fees. Set up your profile in minutes." />`,
      `<meta property="og:url" content="${origin}/provider/onboarding" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="OlogyCrew" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="Build Your Digital Home on OlogyCrew" />`,
      `<meta name="twitter:description" content="Your business deserves a digital home. Get discovered, get booked, get paid — no gatekeeping, no lead fees." />`,
      `<meta property="og:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/ologycrew-referral-og-compressed_d69712f3.jpg" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta name="twitter:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/ologycrew-referral-og-compressed_d69712f3.jpg" />`,
    ].join("\n    ");
  }

  // Signup referral page (/signup?ref=...)
  if (!ogTags && url.startsWith("/signup")) {
    ogTags = [
      `<meta property="og:title" content="Join OlogyCrew — The Digital Home for Your Business" />`,
      `<meta property="og:description" content="Get discovered, get booked, get paid. OlogyCrew gives you a professional profile, booking system, and payment infrastructure — all in one place." />`,
      `<meta property="og:url" content="${origin}/signup" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="OlogyCrew" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="Join OlogyCrew — The Digital Home for Your Business" />`,
      `<meta name="twitter:description" content="Get discovered, get booked, get paid. OlogyCrew gives you a professional profile, booking system, and payment infrastructure — all in one place." />`,
      `<meta property="og:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/ologycrew-referral-og-compressed_d69712f3.jpg" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta name="twitter:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/ologycrew-referral-og-compressed_d69712f3.jpg" />`,
    ].join("\n    ");
  }

  // Homepage (exact match on / or /?)
  if (!ogTags && (url === "/" || url === "/?")) {
    ogTags = await getHomepageOgTags(origin);
  }

  // Fallback OG tags for any page that doesn't have specific ones
  if (!ogTags) {
    ogTags = [
      `<meta property="og:title" content="OlogyCrew \u2014 The Digital Home for Your Business" />`,
      `<meta property="og:description" content="Your business. Your customers. Your money. Get discovered, get booked, get paid — no gatekeeping." />`,
      `<meta property="og:url" content="${origin}${url.split('?')[0]}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="OlogyCrew" />`,
      `<meta name="twitter:card" content="summary" />`,
      `<meta name="twitter:title" content="OlogyCrew \u2014 The Digital Home for Your Business" />`,
      `<meta name="twitter:description" content="Your business. Your customers. Your money. Get discovered, get booked, get paid — no gatekeeping." />`,
      `<meta property="og:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png" />`,
      `<meta property="og:image:width" content="200" />`,
      `<meta property="og:image:height" content="50" />`,
      `<meta name="twitter:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png" />`,
    ].join("\n    ");
  }

  if (ogTags) {
    // Remove default OG tags from index.html before injecting page-specific ones
    // Social media crawlers use the FIRST og: tags they find, so we must remove defaults
    template = template.replace(/<meta property="og:[^"]*" content="[^"]*"\s*\/>\s*\n?/g, "");
    template = template.replace(/<meta name="twitter:[^"]*" content="[^"]*"\s*\/>\s*\n?/g, "");
    template = template.replace("</head>", `    ${ogTags}\n  </head>`);
  }

  // Inject JSON-LD structured data for AI agent discoverability
  if (!jsonLd && (url === "/" || url === "/?")) {
    jsonLd = getHomepageJsonLd(origin);
  }
  if (jsonLd) {
    template = template.replace("</head>", `    ${jsonLd}\n  </head>`);
  }

  return template;
}

export async function setupVite(app: Express, server: Server) {
  // Attach HMR WebSocket to the same HTTP server so it works through the proxy.
  // The proxy forwards WebSocket upgrade on the same port (3000), so HMR works
  // when the WebSocket shares the HTTP server rather than using a separate port.
  // clientPort: 443 tells the browser to connect on HTTPS port (the proxy port)
  // so the WebSocket connection goes through the proxy correctly.
  const serverOptions = {
    middlewareMode: true,
    hmr: {
      server,
      clientPort: 443,
    },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const origin = `${req.protocol}://${req.get("host")}`;
      template = await injectOgTags(url, template, origin);

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (req, res) => {
    const url = req.originalUrl;
    const indexPath = path.resolve(distPath, "index.html");
    const origin = `${req.protocol}://${req.get("host")}`;

    let html = fs.readFileSync(indexPath, "utf-8");
    html = await injectOgTags(url, html, origin);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}
