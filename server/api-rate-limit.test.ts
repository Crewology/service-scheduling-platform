import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  API_RATE_LIMITS,
  createRateLimitPayload,
  getForwardedClientIp,
} from "./apiRateLimit";
import {
  isApiRateLimitError,
  resetRateLimitNoticeForTests,
  shouldRetryApiQuery,
  shouldShowRateLimitNotice,
} from "../client/src/lib/apiErrorHandling";

const projectRoot = resolve(import.meta.dirname, "..");

describe("global API rate-limit protection", () => {
  it("uses the original client IP instead of a shared reverse-proxy hop", () => {
    const request = {
      headers: {
        "x-forwarded-for": "203.0.113.42, 10.0.0.8",
      },
      ip: "10.0.0.8",
      socket: { remoteAddress: "10.0.0.9" },
    } as any;

    expect(getForwardedClientIp(request)).toBe("203.0.113.42");
  });

  it("falls back safely when no forwarded client header is available", () => {
    const request = {
      headers: {},
      ip: "198.51.100.17",
      socket: { remoteAddress: "10.0.0.9" },
    } as any;

    expect(getForwardedClientIp(request)).toBe("198.51.100.17");
  });

  it("keeps a stricter write limit while allowing normal multi-tab reading", () => {
    expect(API_RATE_LIMITS.general.limit).toBe(1200);
    expect(API_RATE_LIMITS.general.productionOnly).toBe(true);
    expect(API_RATE_LIMITS.write.limit).toBe(300);
    expect(API_RATE_LIMITS.sensitive.limit).toBe(100);
    expect(API_RATE_LIMITS.write.limit).toBeLessThan(API_RATE_LIMITS.general.limit);
  });

  it("returns structured recovery guidance and a retry delay", () => {
    const now = new Date("2026-08-31T20:00:00.000Z").getTime();
    const payload = createRateLimitPayload(new Date(now + 95_000), now);

    expect(payload.code).toBe("RATE_LIMITED");
    expect(payload.retryAfterSeconds).toBe(95);
    expect(payload.error).toContain("Please wait a moment");
  });
});

describe("client-side 429 recovery", () => {
  it("recognizes HTTP, tRPC-code, and message-based rate-limit errors", () => {
    expect(isApiRateLimitError({ data: { httpStatus: 429 } })).toBe(true);
    expect(isApiRateLimitError({ shape: { data: { code: "TOO_MANY_REQUESTS" } } })).toBe(true);
    expect(isApiRateLimitError({ message: "Too many requests" })).toBe(true);
    expect(isApiRateLimitError({ message: "Connection failed" })).toBe(false);
  });

  it("does not automatically retry a 429 and amplify the request burst", () => {
    expect(shouldRetryApiQuery(0, { data: { httpStatus: 429 } })).toBe(false);
    expect(shouldRetryApiQuery(0, new Error("Temporary connection issue"))).toBe(true);
    expect(shouldRetryApiQuery(2, new Error("Temporary connection issue"))).toBe(false);
  });

  it("deduplicates rate-limit notices during the same request burst", () => {
    resetRateLimitNoticeForTests();
    expect(shouldShowRateLimitNotice(100_000)).toBe(true);
    expect(shouldShowRateLimitNotice(110_000)).toBe(false);
    expect(shouldShowRateLimitNotice(131_000)).toBe(true);
  });
});

describe("background request reduction", () => {
  const serverSource = readFileSync(
    resolve(projectRoot, "server/_core/index.ts"),
    "utf8",
  );
  const headerSource = readFileSync(
    resolve(projectRoot, "client/src/components/shared/NavHeader.tsx"),
    "utf8",
  );
  const homeSource = readFileSync(
    resolve(projectRoot, "client/src/pages/LoggedInHome.tsx"),
    "utf8",
  );

  it("does not open notification queries or SSE for logged-out visitors", () => {
    expect(headerSource).toContain("enabled: isAuthenticated && open");
    expect(headerSource).toContain("enabled: isAuthenticated,");
    expect(headerSource).toContain("{isAuthenticated && <NotificationDropdown />}");
  });

  it("uses SSE with one-minute polling only as a fallback", () => {
    expect(headerSource).toContain("refetchInterval: sseConnected ? false : 60000");
    expect(headerSource).toContain("refetchInterval: 60000");
    expect(headerSource).not.toContain("refetchInterval: 15000");
  });

  it("removes duplicate polling from the logged-in launchpad", () => {
    const quickStats = homeSource.slice(
      homeSource.indexOf("// Fetch quick stats"),
      homeSource.indexOf("// Fetch provider profile"),
    );
    expect(quickStats).not.toContain("refetchInterval");
  });

  it("does not apply broad read throttling inside the managed development preview", () => {
    expect(serverSource).toContain('if (isProduction) {\n    app.use("/api/", generalLimiter);');
    expect(serverSource).toContain('app.use("/api/trpc", writeLimiter)');
    expect(serverSource).toContain('app.use("/api/oauth/", sensitiveLimiter)');
  });

  it("marks application responses so upstream preview throttling can be identified", () => {
    expect(serverSource).toContain('res.setHeader("X-OlogyCrew-Origin", "application")');
  });
});
