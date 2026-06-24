/**
 * Simple in-memory rate limiter for auth endpoints.
 * Tracks attempts per IP address with configurable window and max attempts.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(store.entries())) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;   // Time window in milliseconds
  maxAttempts: number; // Max attempts per window
}

export const RATE_LIMITS = {
  register: { windowMs: 60 * 60 * 1000, maxAttempts: 5 },   // 5 signups per IP per hour
  login: { windowMs: 15 * 60 * 1000, maxAttempts: 10 },     // 10 login attempts per 15 min
  forgotPassword: { windowMs: 60 * 60 * 1000, maxAttempts: 3 }, // 3 reset requests per hour
  resendVerification: { windowMs: 60 * 60 * 1000, maxAttempts: 3 }, // 3 resends per hour
};

/**
 * Check if a request should be rate limited.
 * Returns { limited: true, retryAfterMs } if over limit, or { limited: false } if allowed.
 */
export function checkRateLimit(
  ip: string,
  action: string,
  config: RateLimitConfig
): { limited: boolean; retryAfterMs?: number } {
  const key = `${action}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // First attempt or window expired — start fresh
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { limited: false };
  }

  if (entry.count >= config.maxAttempts) {
    // Over limit
    return { limited: true, retryAfterMs: entry.resetAt - now };
  }

  // Increment count
  entry.count++;
  return { limited: false };
}

/**
 * Get the client IP from the request, accounting for proxies.
 */
export function getClientIp(req: { headers: Record<string, any>; ip?: string; socket?: { remoteAddress?: string } }): string {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}
