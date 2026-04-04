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
    max: 300, // 300 requests per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    validate: { xForwardedForHeader: false },
  });
  const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30, // 30 requests per 15 min for sensitive endpoints
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

  // Booking export routes (CSV/PDF)
  const cookieParser = await import("cookie-parser");
  app.use(cookieParser.default());
  const { handleCSVExport, handlePDFExport } = await import("../bookingExport");
  app.get("/api/export/bookings/csv", handleCSVExport);
  app.get("/api/export/bookings/pdf", handlePDFExport);

  // Calendar feed route (iCal)
  const { handleCalendarFeed, handleBookingIcsDownload } = await import("../calendarFeed");
  app.get("/api/calendar/:token/feed.ics", handleCalendarFeed);
  app.get("/api/calendar/booking/:bookingId/download.ics", handleBookingIcsDownload);
  // OAuth callback under /api/oauth/callback
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
  });
}

startServer().catch(console.error);
