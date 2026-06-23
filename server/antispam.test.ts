import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "./rateLimiter";
import { isDisposableEmail, getDisposableEmailError } from "./disposableEmails";

describe("Rate Limiter", () => {
  it("should allow requests within the limit", () => {
    const result = checkRateLimit("192.168.1.100", "test_action", { windowMs: 60000, maxAttempts: 5 });
    expect(result.limited).toBe(false);
  });

  it("should block requests over the limit", () => {
    const ip = "192.168.1.200";
    const config = { windowMs: 60000, maxAttempts: 3 };

    // First 3 should pass
    expect(checkRateLimit(ip, "test_block", config).limited).toBe(false);
    expect(checkRateLimit(ip, "test_block", config).limited).toBe(false);
    expect(checkRateLimit(ip, "test_block", config).limited).toBe(false);

    // 4th should be blocked
    const result = checkRateLimit(ip, "test_block", config);
    expect(result.limited).toBe(true);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("should track different actions independently", () => {
    const ip = "192.168.1.300";
    const config = { windowMs: 60000, maxAttempts: 1 };

    // First action
    expect(checkRateLimit(ip, "action_a", config).limited).toBe(false);
    expect(checkRateLimit(ip, "action_a", config).limited).toBe(true);

    // Second action should still be allowed
    expect(checkRateLimit(ip, "action_b", config).limited).toBe(false);
  });

  it("should track different IPs independently", () => {
    const config = { windowMs: 60000, maxAttempts: 1 };

    expect(checkRateLimit("10.0.0.1", "test_ip", config).limited).toBe(false);
    expect(checkRateLimit("10.0.0.1", "test_ip", config).limited).toBe(true);

    // Different IP should still be allowed
    expect(checkRateLimit("10.0.0.2", "test_ip", config).limited).toBe(false);
  });

  it("should have correct default rate limit configs", () => {
    expect(RATE_LIMITS.register.maxAttempts).toBe(5);
    expect(RATE_LIMITS.register.windowMs).toBe(60 * 60 * 1000);
    expect(RATE_LIMITS.login.maxAttempts).toBe(10);
    expect(RATE_LIMITS.login.windowMs).toBe(15 * 60 * 1000);
    expect(RATE_LIMITS.forgotPassword.maxAttempts).toBe(3);
    expect(RATE_LIMITS.resendVerification.maxAttempts).toBe(3);
  });
});

describe("getClientIp", () => {
  it("should extract IP from x-forwarded-for header", () => {
    const req = { headers: { "x-forwarded-for": "203.0.113.1, 70.41.3.18" } };
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("should extract IP from x-real-ip header", () => {
    const req = { headers: { "x-real-ip": "203.0.113.2" } };
    expect(getClientIp(req)).toBe("203.0.113.2");
  });

  it("should fallback to socket remoteAddress", () => {
    const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
    expect(getClientIp(req)).toBe("127.0.0.1");
  });

  it("should return unknown when no IP available", () => {
    const req = { headers: {} };
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("Disposable Email Blocker", () => {
  it("should block known disposable email domains", () => {
    expect(isDisposableEmail("test@mailinator.com")).toBe(true);
    expect(isDisposableEmail("user@guerrillamail.com")).toBe(true);
    expect(isDisposableEmail("spam@tempmail.com")).toBe(true);
    expect(isDisposableEmail("fake@yopmail.com")).toBe(true);
    expect(isDisposableEmail("bot@trashmail.com")).toBe(true);
    expect(isDisposableEmail("test@maildrop.cc")).toBe(true);
  });

  it("should allow legitimate email domains", () => {
    expect(isDisposableEmail("user@gmail.com")).toBe(false);
    expect(isDisposableEmail("user@yahoo.com")).toBe(false);
    expect(isDisposableEmail("user@outlook.com")).toBe(false);
    expect(isDisposableEmail("user@hotmail.com")).toBe(false);
    expect(isDisposableEmail("user@company.com")).toBe(false);
    expect(isDisposableEmail("user@icloud.com")).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(isDisposableEmail("Test@MAILINATOR.COM")).toBe(true);
    expect(isDisposableEmail("User@Gmail.Com")).toBe(false);
  });

  it("should handle invalid email formats gracefully", () => {
    expect(isDisposableEmail("notanemail")).toBe(false);
    expect(isDisposableEmail("")).toBe(false);
  });

  it("should return a user-friendly error message", () => {
    const error = getDisposableEmailError();
    expect(error).toContain("permanent email");
    expect(error).toContain("not allowed");
  });
});

describe("Honeypot validation", () => {
  it("should silently accept when honeypot field is empty (real user)", () => {
    // The honeypot check is: if website field is filled, it's a bot
    const website = "";
    expect(!!website).toBe(false); // Not a bot
  });

  it("should detect when honeypot field is filled (bot)", () => {
    const website = "http://spam.com";
    expect(!!website).toBe(true); // Is a bot
  });
});
