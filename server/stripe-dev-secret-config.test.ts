import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function getKey(nodeEnv: string, developmentKey: string | undefined) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_existing_key");
  if (developmentKey !== undefined) vi.stubEnv("STRIPE_DEV_SECRET_KEY", developmentKey);
  else vi.stubEnv("STRIPE_DEV_SECRET_KEY", "");
  vi.resetModules();
  const { ENV } = await import("./_core/env");
  return ENV.stripeSecretKey;
}

describe("Stripe preview-only credential selection", () => {
  it("uses a current test key in development preview only", async () => {
    expect(await getKey("development", "sk_test_validpreview123")).toBe("sk_test_validpreview123");
  });

  it("preserves the existing credential in production, test and unsupported environments", async () => {
    expect(await getKey("production", "sk_test_validpreview123")).toBe("sk_live_existing_key");
    expect(await getKey("test", "sk_test_validpreview123")).toBe("sk_live_existing_key");
  });

  it("never substitutes a publishable, live or malformed development key", async () => {
    for (const key of ["pk_test_notasecret", "sk_live_dontuse", "bad-value", ""]) {
      expect(await getKey("development", key)).toBe("sk_live_existing_key");
    }
  });
});
