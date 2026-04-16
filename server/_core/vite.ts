import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { getProviderOgTags } from "../ogTags";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
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

      // Inject OG meta tags for provider profile pages (/p/:slug)
      const providerMatch = url.match(/^\/p\/([^/?#]+)/);
      if (providerMatch) {
        const ogTags = await getProviderOgTags(providerMatch[1], `${req.protocol}://${req.get("host")}`);
        if (ogTags) {
          template = template.replace("</head>", `    ${ogTags}\n  </head>`);
        }
      }

      // Inject OG meta tags for /referral-program route (for social media crawlers)
      if (url.startsWith("/referral-program")) {
        const origin = `${req.protocol}://${req.get("host")}`;
        const ogTags = [
          `<meta property="og:title" content="OlogyCrew Referral Program — Share & Earn Rewards" />`,
          `<meta property="og:description" content="Refer friends to OlogyCrew and earn credits toward your next booking. Unlock Bronze, Silver, Gold, and Platinum tiers with escalating rewards up to 25%." />`,
          `<meta property="og:url" content="${origin}/referral-program" />`,
          `<meta property="og:type" content="website" />`,
          `<meta property="og:site_name" content="OlogyCrew" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="OlogyCrew Referral Program — Share & Earn Rewards" />`,
          `<meta name="twitter:description" content="Refer friends to OlogyCrew and earn credits toward your next booking. Unlock Bronze, Silver, Gold, and Platinum tiers with escalating rewards up to 25%." />`,
          `<meta property="og:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/ologycrew-referral-og-compressed_d69712f3.jpg" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta name="twitter:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/ologycrew-referral-og-compressed_d69712f3.jpg" />`,
        ].join("\n    ");
        template = template.replace("</head>", `    ${ogTags}\n  </head>`);
      }

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

    // Inject OG meta tags for provider profile pages (/p/:slug) — production
    const providerMatch = url.match(/^\/p\/([^/?#]+)/);
    if (providerMatch) {
      let html = fs.readFileSync(indexPath, "utf-8");
      const ogTags = await getProviderOgTags(providerMatch[1], `${req.protocol}://${req.get("host")}`);
      if (ogTags) {
        html = html.replace("</head>", `    ${ogTags}\n  </head>`);
      }
      return res.status(200).set({ "Content-Type": "text/html" }).end(html);
    }

    // Inject OG meta tags for /referral-program route (for social media crawlers)
    if (url.startsWith("/referral-program")) {
      const origin = `${req.protocol}://${req.get("host")}`;
      let html = fs.readFileSync(indexPath, "utf-8");
      const ogTags = [
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
      html = html.replace("</head>", `    ${ogTags}\n  </head>`);
      return res.status(200).set({ "Content-Type": "text/html" }).end(html);
    }

    res.sendFile(indexPath);
  });
}
