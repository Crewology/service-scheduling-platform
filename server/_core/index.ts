import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // PRIORITY 1: Force HTTPS in production
  // Cloudflare/reverse proxy sets x-forwarded-proto header
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto === 'http' && req.hostname !== 'localhost' && !req.hostname.startsWith('127.')) {
      return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
    }
    next();
  });

  // PRIORITY 2: Security headers via helmet
  app.use(helmet({
    contentSecurityPolicy: false, // Managed per-route for widgets
    crossOriginEmbedderPolicy: false, // Allow embedding resources
  }));

  // Trust proxy for rate limiting behind reverse proxy
  app.set("trust proxy", 1);

  // PRIORITY 2: Rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 600, // 600 requests per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    validate: { xForwardedForHeader: false },
    skip: (req) => {
      // Skip rate limiting for auth routes - they have their own per-action rate limiting
      return req.path.startsWith("/api/auth/");
    },
  });
  const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 requests per 15 min for sensitive endpoints
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts, please try again later." },
    validate: { xForwardedForHeader: false },
  });
  app.use("/api/", generalLimiter);
  app.use("/api/oauth/", sensitiveLimiter);
  app.use("/api/export/", sensitiveLimiter);

  // Stripe webhook MUST be registered BEFORE express.json() middleware
  // to preserve raw body for signature verification
  const { handleStripeWebhook } = await import("../stripeWebhook");
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
  
  // Twilio incoming SMS webhook for STOP/START opt-out handling
  const { handleTwilioSmsWebhook } = await import("../twilioSmsWebhook");
  app.post("/api/twilio/sms", express.urlencoded({ extended: false }), handleTwilioSmsWebhook);

  // Allow embedding in iframes for widget routes
  app.use((req, res, next) => {
    // Allow cross-origin framing for embed/widget pages and their API calls
    if (req.path.startsWith('/embed') || req.path.startsWith('/api/trpc/widget')) {
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.removeHeader('X-Frame-Options');
      res.setHeader('Content-Security-Policy', "frame-ancestors *");
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OG page route for social media sharing (bypasses CDN pre-rendering)
  const { handleOgPage } = await import("../ogPageRoute");
  app.get("/api/og/:type/:id", handleOgPage);

  // Booking export routes (CSV/PDF)
  const cookieParser = await import("cookie-parser");
  app.use(cookieParser.default());
  const { handleCSVExport, handlePDFExport } = await import("../bookingExport");
  app.get("/api/export/bookings/csv", handleCSVExport);
  app.get("/api/export/bookings/pdf", handlePDFExport);

  // Analytics PDF report (Business tier)
  const { handleAnalyticsPDFExport } = await import("../analyticsExport");
  app.get("/api/export/analytics/pdf", handleAnalyticsPDFExport);

  // Payment receipt PDF
  const { handleReceiptPDF } = await import("../receiptExport");
  app.get("/api/receipt/:bookingId/pdf", handleReceiptPDF);

  // Real-time SSE notifications endpoint
  const { sseManager } = await import("../sseManager");
  app.get("/api/sse/notifications", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req as any);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      // Disable request timeout for SSE
      req.setTimeout(0);
      sseManager.addClient(user.id, res);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
    }
  });

  // Calendar feed route (iCal)
  const { handleCalendarFeed, handleBookingIcsDownload } = await import("../calendarFeed");
  app.get("/api/calendar/:token/feed.ics", handleCalendarFeed);
  app.get("/api/calendar/booking/:bookingId/download.ics", handleBookingIcsDownload);
  // Sitemap.xml - proper XML format for search engines
  app.get("/sitemap.xml", (req, res) => {
    const forwardedHost = req.get("x-forwarded-host");
    const host = forwardedHost || req.get("host") || "";
    // Use canonical domain if request comes through internal Cloud Run URL
    const baseUrl = host.includes("ologycrew.com")
      ? `https://${host}`
      : "https://www.ologycrew.com";

    const pages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/browse", priority: "0.9", changefreq: "daily" },
      { loc: "/search", priority: "0.8", changefreq: "daily" },
      { loc: "/pricing", priority: "0.7", changefreq: "weekly" },
      { loc: "/help", priority: "0.6", changefreq: "weekly" },
      { loc: "/referral-program", priority: "0.6", changefreq: "monthly" },
      { loc: "/privacy", priority: "0.3", changefreq: "monthly" },
      { loc: "/terms", priority: "0.3", changefreq: "monthly" },
    ];

    const today = new Date().toISOString().split("T")[0];
    const urls = pages
      .map(
        (p) => `  <url>
    <loc>${baseUrl}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
      )
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
  });

  // Robots.txt
  app.get("/robots.txt", (req, res) => {
    const forwardedHost = req.get("x-forwarded-host");
    const host = forwardedHost || req.get("host") || "";
    const baseUrl = host.includes("ologycrew.com")
      ? `https://${host}`
      : "https://www.ologycrew.com";

    const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /provider-dashboard
Disallow: /messages
Disallow: /bookings
Disallow: /account
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml`;

    res.set("Content-Type", "text/plain");
    res.send(robotsTxt);
  });

  // Scheduled task: trial expiry check (Heartbeat cron)
  const { handleScheduledTrialExpiry } = await import("../scheduledTrialExpiry");
  app.post("/api/scheduled/trial-expiry", handleScheduledTrialExpiry);

  // Custom auth routes (email/password + Google OAuth)
  const customAuthRouter = (await import("../customAuthRouter")).default;
  app.use(customAuthRouter);

  // Legacy OAuth callback under /api/oauth/callback (kept for existing sessions)
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Start the reminder service (checks every 15 minutes for upcoming bookings)
    import("../reminderService").then(({ startReminderService }) => {
      startReminderService();
    }).catch(err => {
      console.error("Failed to start reminder service:", err);
    });

    // Start the review reminder service (checks every 30 minutes for completed bookings needing reviews)
    import("../reviewReminderService").then(({ startReviewReminderService }) => {
      startReviewReminderService();
    }).catch(err => {
      console.error("Failed to start review reminder service:", err);
    });

    // Start the credit expiration scheduler (runs every 24 hours)
    import("../jobs/creditExpiration").then(({ startCreditExpirationScheduler }) => {
      startCreditExpirationScheduler();
    }).catch(err => {
      console.error("Failed to start credit expiration scheduler:", err);
    });
  });
}

startServer().catch(console.error);
