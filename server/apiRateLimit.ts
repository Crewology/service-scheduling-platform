import type { Request, Response } from "express";
import { ipKeyGenerator } from "express-rate-limit";

export const API_RATE_LIMITS = {
  general: {
    windowMs: 15 * 60 * 1000,
    limit: 1200,
    identifier: "general-api",
    productionOnly: true,
  },
  write: {
    windowMs: 15 * 60 * 1000,
    limit: 300,
    identifier: "api-writes",
  },
  sensitive: {
    windowMs: 15 * 60 * 1000,
    limit: 100,
    identifier: "sensitive-api",
  },
} as const;

type RateLimitRequest = Request & {
  rateLimit?: {
    resetTime?: Date;
  };
};

export function getForwardedClientIp(req: Pick<Request, "headers" | "ip" | "socket">): string {
  const forwarded = req.headers["x-forwarded-for"];
  const firstForwardedIp = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0]?.trim();

  return firstForwardedIp || req.headers["x-real-ip"]?.toString() || req.ip || req.socket.remoteAddress || "unknown";
}

export function getApiRateLimitKey(req: Request): string {
  return ipKeyGenerator(getForwardedClientIp(req));
}

export function createRateLimitPayload(resetTime?: Date, now = Date.now()) {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(((resetTime?.getTime() ?? now + 60_000) - now) / 1000),
  );

  return {
    code: "RATE_LIMITED" as const,
    error: "OlogyCrew is receiving requests too quickly from this device. Please wait a moment and try again.",
    retryAfterSeconds,
  };
}

export function sendRateLimitResponse(req: Request, res: Response) {
  const payload = createRateLimitPayload((req as RateLimitRequest).rateLimit?.resetTime);
  res.setHeader("Retry-After", payload.retryAfterSeconds.toString());
  res.status(429).json(payload);
}
